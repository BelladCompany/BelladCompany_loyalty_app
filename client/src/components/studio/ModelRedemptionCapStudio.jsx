import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Percent,
  Check,
  Trash2,
  Sparkles,
  Layers,
  Car,
  Bike,
  ShieldCheck,
  RefreshCw,
  Info,
  ArrowRight,
  Plus,
} from 'lucide-react';
import ApiService from '../../services/api';

// Curated Brands & Their Models Hierarchy
const BRAND_MODELS_MAP = {
  'HERO MOTO CORP': {
    displayName: 'Hero Moto Corp',
    icon: Bike,
    color: 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100',
    activeColor: 'bg-red-600 text-white border-red-600 shadow-sm',
    models: [
      'ALL',
      'Splendor+',
      'HF Deluxe',
      'Passion+',
      'Destini',
      'Xtreme 125R',
      'Glamour',
      'Pleasure+',
      'Xoom',
      'Xpulse 200',
      'HF 100',
    ],
  },
  'TATA MOTORS': {
    displayName: 'Tata Motors',
    icon: Car,
    color: 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100',
    activeColor: 'bg-blue-600 text-white border-blue-600 shadow-sm',
    models: [
      'ALL',
      'Nexon',
      'Punch',
      'Harrier',
      'Safari',
      'Tiago',
      'Altroz',
      'Curvv',
      'Tigor',
      'Sierra',
    ],
  },
  'HYUNDAI': {
    displayName: 'Hyundai',
    icon: Car,
    color: 'border-sky-200 text-sky-800 bg-sky-50 hover:bg-sky-100',
    activeColor: 'bg-sky-700 text-white border-sky-700 shadow-sm',
    models: [
      'ALL',
      'Creta',
      'Venue',
      'Exter',
      'i20',
      'Grand i10 NIOS',
      'Aura',
      'Verna',
      'Alcazar',
      'Tucson',
    ],
  },
  'MG MOTORS': {
    displayName: 'MG Motors',
    icon: Car,
    color: 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100',
    activeColor: 'bg-emerald-700 text-white border-emerald-700 shadow-sm',
    models: [
      'ALL',
      'Windsor EV',
      'Comet EV',
      'ZS EV',
      'Astor',
      'Hector',
      'Gloster',
    ],
  },
  'ATHER ENERGY': {
    displayName: 'Ather Energy',
    icon: Bike,
    color: 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100',
    activeColor: 'bg-teal-700 text-white border-teal-700 shadow-sm',
    models: [
      'ALL',
      '450X',
      'Rizta',
      '450S',
      '450 Apex',
    ],
  },
  'SWARAJ': {
    displayName: 'Swaraj (Agri)',
    icon: Car,
    color: 'border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100',
    activeColor: 'bg-amber-600 text-white border-amber-600 shadow-sm',
    models: [
      'ALL',
      '742',
      '744 FE',
      '855 FE',
      '735 XT',
      '717',
    ],
  },
  'ALL': {
    displayName: 'ALL Brands (Global)',
    icon: Layers,
    color: 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100',
    activeColor: 'bg-slate-800 text-white border-slate-800 shadow-sm',
    models: ['ALL'],
  },
};

export default function ModelRedemptionCapStudio({ tenantId = 'bellad_and_company', user }) {
  const [caps, setCaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Step 1: Selected Brand ───────────────────────────────────────────────────
  const [selectedBrand, setSelectedBrand] = useState('HERO MOTO CORP');

  // ── Step 2: Selected Model (filtered strictly by Selected Brand) ─────────────
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [customModelInput, setCustomModelInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // ── Step 3: Percentage Scroll Bar (1% to 100%) ───────────────────────────────
  const [capPercent, setCapPercent] = useState(100);

  // ── Step 4: Simple Calculator Inputs ─────────────────────────────────────────
  const [calcPoints, setCalcPoints] = useState(1000);
  const [calcBill, setCalcBill] = useState(1500);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  };

  // Load existing caps from PostgreSQL
  const loadCaps = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiService.getModelRedemptionCaps({ tenant_id: tenantId });
      if (res.data) {
        setCaps(res.data);
      }
    } catch (err) {
      console.error('Failed to load caps:', err);
      showToast(err.message || 'Failed to load configured caps', true);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadCaps();
  }, [loadCaps]);

  // When selectedBrand or selectedModel changes, sync slider to existing saved cap in DB (if any)
  useEffect(() => {
    const effectiveModel = isCustomMode ? customModelInput.trim() : selectedModel;
    if (!effectiveModel) return;

    // Look for exact match
    const existing = caps.find(
      (c) =>
        c.brand_name.toLowerCase() === selectedBrand.toLowerCase() &&
        c.model_name.toLowerCase() === effectiveModel.toLowerCase()
    );

    if (existing) {
      setCapPercent(Number(existing.redemption_cap_percent));
    } else {
      // Look for brand default
      const brandDefault = caps.find(
        (c) =>
          c.brand_name.toLowerCase() === selectedBrand.toLowerCase() &&
          c.model_name.toUpperCase() === 'ALL'
      );
      if (brandDefault) {
        setCapPercent(Number(brandDefault.redemption_cap_percent));
      } else {
        // Fallbacks: Default to 100% full redemption across all brands
        setCapPercent(100);
      }
    }
  }, [selectedBrand, selectedModel, isCustomMode, customModelInput, caps]);

  // Models available for current brand
  const availableModels = useMemo(() => {
    const config = BRAND_MODELS_MAP[selectedBrand];
    return config ? config.models : ['ALL'];
  }, [selectedBrand]);

  // Brand switch handler
  const handleSelectBrand = (brandKey) => {
    setSelectedBrand(brandKey);
    setSelectedModel('ALL');
    setIsCustomMode(false);
    setCustomModelInput('');
  };

  // Model switch handler
  const handleSelectModel = (model) => {
    setIsCustomMode(false);
    setSelectedModel(model);
  };

  // Save Cap to PostgreSQL
  const handleSaveCurrentCap = async () => {
    const effectiveModel = isCustomMode ? customModelInput.trim() : selectedModel;
    if (!effectiveModel) {
      showToast('Please select or enter a vehicle model.', true);
      return;
    }

    const key = `${selectedBrand}_${effectiveModel}`;
    setSavingKey(key);

    try {
      const res = await ApiService.saveModelRedemptionCap({
        tenant_id: tenantId,
        brand_name: selectedBrand,
        model_name: effectiveModel,
        redemption_cap_percent: capPercent,
        description:
          effectiveModel.toUpperCase() === 'ALL'
            ? `All ${selectedBrand} models: ${capPercent}% redemption cap`
            : `${selectedBrand} ${effectiveModel}: ${capPercent}% redemption cap`,
      });

      showToast(res.message || `Saved ${capPercent}% cap for ${selectedBrand} - ${effectiveModel}!`);
      await loadCaps();
    } catch (err) {
      console.error('Failed to save cap:', err);
      showToast(err.message || 'Failed to save percentage cap.', true);
    } finally {
      setSavingKey(null);
    }
  };

  // Delete/Reset Cap
  const handleDeleteCap = async (id, brand, model) => {
    if (!window.confirm(`Reset cap for ${brand} ${model}? It will revert to default.`)) return;
    try {
      const res = await ApiService.deleteModelRedemptionCap(id);
      showToast(res.message || 'Percentage cap reset to default.');
      await loadCaps();
    } catch (err) {
      showToast(err.message || 'Failed to delete cap.', true);
    }
  };

  // ── SIMPLE LIVE ARITHMETIC PREVIEW ──────────────────────────────────────────
  const calculation = useMemo(() => {
    const pts = Math.max(0, parseInt(calcPoints, 10) || 0);
    const bill = Math.max(0, parseFloat(calcBill) || 0);
    const pct = Math.max(1, Math.min(100, parseFloat(capPercent) || 1));
    const rate = 0.25; // 4 pts = ₹1

    const maxRedeemPts = Math.floor(pts * (pct / 100));
    const maxDiscountRs = maxRedeemPts * rate;
    const keptPts = pts - maxRedeemPts;
    const keptRs = keptPts * rate;

    const discountApplied = bill > 0 ? Math.min(maxDiscountRs, bill) : 0;
    const ptsDeducted = bill > 0 ? Math.min(maxRedeemPts, Math.round(discountApplied / rate)) : 0;
    const cashToPay = Math.max(0, bill - discountApplied);
    const newEarned = Math.floor((cashToPay / 100) * 4);
    const finalBalance = (pts - ptsDeducted) + newEarned;

    return {
      pts,
      bill,
      pct,
      maxRedeemPts,
      maxDiscountRs,
      keptPts,
      keptRs,
      discountApplied,
      ptsDeducted,
      cashToPay,
      newEarned,
      finalBalance,
    };
  }, [calcPoints, calcBill, capPercent]);

  // Caps matching current brand
  const brandCaps = useMemo(() => {
    if (selectedBrand === 'ALL') return caps;
    return caps.filter((c) => c.brand_name.toLowerCase() === selectedBrand.toLowerCase());
  }, [caps, selectedBrand]);

  const effectiveTargetName = isCustomMode
    ? customModelInput.trim() || 'Custom Model'
    : selectedModel === 'ALL'
    ? `ALL ${selectedBrand} Models`
    : selectedModel;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all animate-fadeIn ${
            toast.isError
              ? 'bg-rose-900 text-rose-100 border border-rose-700'
              : 'bg-emerald-900 text-emerald-100 border border-emerald-700'
          }`}
        >
          {toast.isError ? <AlertCircle className="w-4 h-4 text-rose-300" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-indigo-600" />
              Dynamic Model Setter
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Cashier Counter Auto-Sync Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Model Redemption % Setter
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Select a <strong>Brand</strong>, choose a <strong>Model</strong> (or ALL), and set the redemption scroll bar from <strong>1% to 100%</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCaps}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          title="Reload caps"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────
          MAIN CARD: 3-STEP CLEAN SETTER & SLIDER
      ─────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">

        {/* ── STEP 1: SELECT BRAND NAME ── */}
        <div className="space-y-2.5">
          <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">1</span>
            Select Brand Name:
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(BRAND_MODELS_MAP).map((brandKey) => {
              const brandInfo = BRAND_MODELS_MAP[brandKey];
              const isSelected = selectedBrand === brandKey;
              const IconComp = brandInfo.icon;

              return (
                <button
                  key={brandKey}
                  type="button"
                  onClick={() => handleSelectBrand(brandKey)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected ? brandInfo.activeColor : brandInfo.color
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{brandInfo.displayName}</span>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 2: SELECT MODEL (FILTERED BY SELECTED BRAND) ── */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">2</span>
              Select Model for {BRAND_MODELS_MAP[selectedBrand]?.displayName || selectedBrand}:
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              Choose <strong>"ALL"</strong> for all models or pick a specific model
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {availableModels.map((model) => {
              const isAll = model.toUpperCase() === 'ALL';
              const isSelected = !isCustomMode && selectedModel === model;

              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleSelectModel(model)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                      : isAll
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isAll ? `★ ALL (${selectedBrand} Models)` : model}
                </button>
              );
            })}

            {/* Custom Model Option */}
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                setSelectedModel('');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                isCustomMode
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-dashed border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>+ Custom Model</span>
            </button>
          </div>

          {/* Custom Model Input if selected */}
          {isCustomMode && (
            <div className="pt-2">
              <input
                type="text"
                placeholder="Enter custom vehicle model name..."
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                className="w-full sm:w-72 h-9 px-3 rounded-xl border border-indigo-300 bg-indigo-50/50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* ── STEP 3: PERCENTAGE SCROLL BAR (1% TO 100%) ── */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black flex items-center justify-center">3</span>
                Redemption Percentage Scroll Bar (1% – 100%)
              </span>
              <h3 className="text-base font-black text-white mt-0.5">
                Cap for: <span className="text-amber-300">{selectedBrand}</span> • <span className="text-emerald-300">{effectiveTargetName}</span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={capPercent}
                  onChange={(e) => setCapPercent(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                  className="w-14 bg-transparent text-xl font-black text-white text-center focus:outline-none font-mono"
                />
                <span className="text-lg font-black text-emerald-400">%</span>
              </div>

              <button
                type="button"
                onClick={handleSaveCurrentCap}
                disabled={savingKey !== null}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black shadow-md transition active:scale-98 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{savingKey ? 'Saving...' : `Save ${capPercent}% Cap`}</span>
              </button>
            </div>
          </div>

          {/* The Live Scroll Bar / Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={capPercent}
              onChange={(e) => setCapPercent(parseInt(e.target.value, 10))}
              className="w-full h-3.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />

            <div className="flex justify-between text-[11px] font-mono text-slate-400 font-bold px-1">
              <span>1% (Minimum)</span>
              <span className="text-indigo-300">25%</span>
              <span className="text-indigo-300">50%</span>
              <span className="text-indigo-300">75%</span>
              <span className="text-emerald-400 font-black">100% (Full Redemption)</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {[
              { label: '10%', val: 10 },
              { label: '25%', val: 25 },
              { label: '50%', val: 50 },
              { label: '75%', val: 75 },
              { label: '100% (Full)', val: 100 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setCapPercent(p.val)}
                className={`text-xs font-black px-3 py-1 rounded-lg border transition cursor-pointer ${
                  capPercent === p.val
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Visual Ratio Bar */}
          <div className="pt-2">
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                style={{ width: `${capPercent}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-200"
                style={{ width: `${100 - capPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-300 pt-1 font-bold">
              <span className="text-emerald-300">{capPercent}% Points Allowed for Redemption</span>
              <span className="text-indigo-300">{100 - capPercent}% Points Kept / Protected</span>
            </div>
          </div>
        </div>

        {/* ── STEP 4: SIMPLE LIVE CALCULATOR PREVIEW ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Live Calculation Result Preview
            </span>
            <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
              Formula: 4 PTS = ₹1 Discount
            </span>
          </div>

          {/* 3 Clean Glanceable Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer Point Balance</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={calcPoints}
                  onChange={(e) => setCalcPoints(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-24 text-base font-black text-slate-900 border-b border-dashed border-slate-300 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-500">PTS</span>
              </div>
              <span className="text-[10px] text-slate-400 block">≈ ₹{(calculation.pts * 0.25).toFixed(0)} total value</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-0.5">
              <span className="text-[10px] font-black text-emerald-800 uppercase block">
                Allowed to Redeem ({capPercent}%)
              </span>
              <div className="text-base font-black text-emerald-700">
                {calculation.maxRedeemPts.toLocaleString()} PTS
              </div>
              <span className="text-[10px] font-bold text-emerald-600 block">
                = ₹{calculation.maxDiscountRs.toFixed(2)} direct bill discount
              </span>
            </div>

            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-0.5">
              <span className="text-[10px] font-black text-indigo-800 uppercase block">
                Kept in Account ({100 - capPercent}%)
              </span>
              <div className="text-base font-black text-indigo-700">
                {calculation.keptPts.toLocaleString()} PTS
              </div>
              <span className="text-[10px] font-bold text-indigo-600 block">
                = ₹{calculation.keptRs.toFixed(2)} retained in balance
              </span>
            </div>
          </div>

          {/* Quick Counter Bill Test */}
          <div className="pt-2 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Test Counter Bill:</span>
              <div className="flex items-center gap-1">
                <span>₹</span>
                <input
                  type="number"
                  value={calcBill}
                  onChange={(e) => setCalcBill(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 px-2 py-0.5 rounded border border-slate-300 bg-white font-mono font-bold text-slate-900 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-700 flex items-center gap-2 font-medium">
              <span>Points Used: <strong>{calculation.ptsDeducted} PTS (-₹{calculation.discountApplied.toFixed(0)})</strong></span>
              <span>•</span>
              <span>Customer Pays: <strong className="text-indigo-800 font-bold">₹{calculation.cashToPay.toFixed(0)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────
          SECTION: CURRENT CONFIGURED CAPS FOR THIS BRAND
      ─────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Configured Caps for {selectedBrand === 'ALL' ? 'All Brands' : selectedBrand}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Active redemption caps saved in database.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            {brandCaps.length} Active {brandCaps.length === 1 ? 'Cap' : 'Caps'}
          </span>
        </div>

        {brandCaps.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            No specific caps configured for {selectedBrand}. Currently using global 100% default.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {brandCaps.map((row) => {
              const pct = Number(row.redemption_cap_percent);
              const isAllModel = row.model_name.toUpperCase() === 'ALL';

              return (
                <div
                  key={row.id}
                  className={`p-3.5 rounded-2xl border transition space-y-2 ${
                    isAllModel
                      ? 'bg-indigo-50/70 border-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-xs text-slate-900 block">
                        {isAllModel ? `★ ALL ${row.brand_name} Models` : row.model_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {row.brand_name}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
                        pct === 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : pct >= 50
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrand(row.brand_name);
                        setSelectedModel(row.model_name);
                        setIsCustomMode(false);
                        setCapPercent(pct);
                        window.scrollTo({ top: 150, behavior: 'smooth' });
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      Edit Slider ↑
                    </button>

                    {/* Delete button (except global ALL-ALL) */}
                    {row.brand_name !== 'ALL' || row.model_name !== 'ALL' ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteCap(row.id, row.brand_name, row.model_name)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
