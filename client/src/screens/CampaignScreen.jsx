import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Zap,
  Plus,
  Search,
  Sliders,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  FileSpreadsheet,
  Copy,
  Ban,
  Check,
  ChevronRight,
  TrendingUp,
  Receipt,
  Sparkles,
  RefreshCw,
  Building2,
  Car,
  Bike,
  Tag,
  ShieldAlert,
  ArrowUpRight,
  Download,
  Info,
} from 'lucide-react';
import ApiService from '../services/api';

const STATUS_BADGES = {
  LIVE: { label: 'Live Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  DRAFT: { label: 'Draft', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  EXPIRED: { label: 'Expired', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function CampaignScreen({ user }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState(null);

  // Lookups data
  const [lookups, setLookups] = useState({
    brands: ['Hero', 'Tata', 'Hyundai', 'MG', 'Kia', 'Mahindra', 'Honda', 'Toyota'],
    models: ['Splendor Plus', 'Splendor+ XTEC', 'HF Deluxe', 'Glamour', 'Passion Plus', 'Nexon', 'Punch', 'Harrier', 'Creta', 'Venue'],
    branches: [
      { id: 1, name: 'Hubballi Main Showroom' },
      { id: 2, name: 'Belagavi Branch' },
      { id: 3, name: 'Dharwad Service Center' },
      { id: 4, name: 'Vijayapura Branch' },
    ],
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [saving, setSaving] = useState(false);

  // Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Form State
  const defaultFormData = {
    code: '',
    name: '',
    type: 'PCT_OF_STANDARD',
    value: 25,
    max_bonus_per_invoice: '',
    vehicle_type: 'ALL',
    spend_category: 'sale',
    brand: 'ALL',
    all_models: true,
    models: [],
    all_branches: true,
    branches: [],
    customer_tier: 'ALL',
    min_spend: 0,
    max_spend: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    date_basis: 'INVOICE',
    stacking: 'STACK',
    priority: 100,
    redeem_lock_days: '',
    notes: '',
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [modelSearch, setModelSearch] = useState('');
  const [overlapWarnings, setOverlapWarnings] = useState([]);

  // Simulator State
  const [simForm, setSimForm] = useState({
    amount: 80000,
    brand: 'Hero',
    model: 'Splendor Plus',
    branch_id: 1,
    date: new Date().toISOString().slice(0, 10),
  });
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [syncingDummy, setSyncingDummy] = useState(false);

  // Sync all active campaigns to dummy model customers
  const handleSyncDummyCustomers = async () => {
    try {
      setSyncingDummy(true);
      const res = await ApiService.syncDummyCustomers();
      setFeedback({
        type: 'success',
        message: `Synced ${res.data?.synced_count || 17} dummy customer models! Search 'Dummy' in Customer Search to see all updated points & ₹ rupee values.`
      });
    } catch (err) {
      setFeedback({ type: 'error', message: `Sync failed: ${err.message}` });
    } finally {
      setSyncingDummy(false);
    }
  };

  // Load Campaigns & Lookups
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [campRes, lookupsRes, branchesRes] = await Promise.all([
        ApiService.getCampaigns().catch(() => ({ data: [] })),
        ApiService.request('/master-rules/lookups?tenant_id=bellad_and_company').catch(() => ({ data: {} })),
        ApiService.getBranches().catch(() => ({ data: [] })),
      ]);

      const list = Array.isArray(campRes) ? campRes : (campRes.campaigns || campRes.data || []);
      setCampaigns(list);

      const newLookups = { ...lookups };
      if (lookupsRes?.data?.brands?.length) newLookups.brands = lookupsRes.data.brands;
      if (lookupsRes?.data?.models?.length) newLookups.models = lookupsRes.data.models;
      if (branchesRes?.data?.length) {
        newLookups.branches = branchesRes.data.map((b) => ({
          id: b.branch_id || b.id,
          name: b.branch_name || b.name,
        }));
      }
      setLookups(newLookups);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load campaigns' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick Stats
  const stats = useMemo(() => {
    const total = campaigns.length;
    const live = campaigns.filter((c) => (c.status_derived || c.derived_status) === 'LIVE').length;
    const totalBonus = campaigns.reduce((acc, c) => acc + (parseInt(c.total_bonus_issued || c.bonus_points_issued, 10) || 0), 0);
    const totalInvoices = campaigns.reduce((acc, c) => acc + (parseInt(c.invoices_benefited || c.invoices_count, 10) || 0), 0);
    return { total, live, totalBonus, totalInvoices };
  }, [campaigns]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.brand && c.brand.toLowerCase().includes(q)) ||
        (c.spend_category && c.spend_category.toLowerCase().includes(q));

      const campStatus = c.status_derived || c.derived_status || c.status;
      const matchesStatus =
        statusFilter === 'ALL' ||
        campStatus === statusFilter ||
        (statusFilter === 'ACTIVE' && c.status === 'ACTIVE');

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setFormData({
      ...defaultFormData,
      code: `CAMP-${String(campaigns.length + 1).padStart(4, '0')}`,
    });
    setOverlapWarnings([]);
    setSimResult(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (camp) => {
    setEditingCampaign(camp);
    setFormData({
      code: camp.code,
      name: camp.name,
      type: camp.type,
      value: camp.value,
      max_bonus_per_invoice: camp.max_bonus_per_invoice != null ? camp.max_bonus_per_invoice : '',
      vehicle_type: camp.vehicle_type || 'ALL',
      spend_category: camp.spend_category || 'sale',
      brand: camp.brand || 'ALL',
      all_models: Boolean(camp.all_models),
      models: camp.models || [],
      all_branches: Boolean(camp.all_branches),
      branches: (camp.branches || []).map(Number),
      customer_tier: camp.customer_tier || 'ALL',
      min_spend: camp.min_spend || 0,
      max_spend: camp.max_spend != null ? camp.max_spend : '',
      start_date: camp.start_date ? camp.start_date.slice(0, 10) : '',
      end_date: camp.end_date ? camp.end_date.slice(0, 10) : '',
      date_basis: camp.date_basis || 'INVOICE',
      stacking: camp.stacking || 'STACK',
      priority: camp.priority != null ? camp.priority : 100,
      redeem_lock_days: camp.redeem_lock_days != null ? camp.redeem_lock_days : '',
      notes: camp.notes || '',
    });
    setOverlapWarnings([]);
    setSimResult(null);
    setModalOpen(true);
  };

  // Form Field Change
  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  // Save Campaign (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...formData,
        value: Number(formData.value),
        max_bonus_per_invoice: formData.max_bonus_per_invoice !== '' ? Number(formData.max_bonus_per_invoice) : null,
        min_spend: Number(formData.min_spend || 0),
        max_spend: formData.max_spend !== '' ? Number(formData.max_spend) : null,
        priority: Number(formData.priority || 100),
        redeem_lock_days: formData.redeem_lock_days !== '' ? Number(formData.redeem_lock_days) : null,
      };

      if (editingCampaign) {
        await ApiService.updateCampaign(editingCampaign.id, payload);
        setFeedback({ type: 'success', message: `Campaign '${formData.name}' updated successfully and applied to dummy model customers!` });
      } else {
        await ApiService.createCampaign(payload);
        setFeedback({ type: 'success', message: `Campaign '${formData.name}' created as DRAFT!` });
      }

      setModalOpen(false);
      await loadData();
      try {
        await ApiService.syncDummyCustomers();
      } catch (_) {}
    } catch (err) {
      console.error('Failed to save campaign:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to save campaign' });
    } finally {
      setSaving(false);
    }
  };

  // Activate Campaign
  const handleActivate = async (camp) => {
    if (!window.confirm(`Activate campaign '${camp.name}' (${camp.code})? It will immediately start evaluating on matching sales.`)) {
      return;
    }
    try {
      const res = await ApiService.activateCampaign(camp.id);
      if (res.warnings && res.warnings.length > 0) {
        alert(`Campaign Activated with Warnings:\n${res.warnings.map((w) => w.message).join('\n')}`);
      }
      setFeedback({ type: 'success', message: `Campaign '${camp.name}' is now ACTIVE and applied to matching dummy customers!` });
      await loadData();
      try {
        await ApiService.syncDummyCustomers();
      } catch (_) {}
    } catch (err) {
      alert(`Activation error: ${err.message}`);
    }
  };

  // Cancel Campaign
  const handleCancel = async (camp) => {
    if (!window.confirm(`Are you sure you want to cancel campaign '${camp.name}'? This cannot be undone.`)) {
      return;
    }
    try {
      await ApiService.cancelCampaign(camp.id);
      setFeedback({ type: 'success', message: `Campaign '${camp.name}' has been CANCELLED and dummy customers synced.` });
      await loadData();
      try {
        await ApiService.syncDummyCustomers();
      } catch (_) {}
    } catch (err) {
      alert(`Cancel error: ${err.message}`);
    }
  };

  // Duplicate Campaign
  const handleDuplicate = async (camp) => {
    try {
      const res = await ApiService.duplicateCampaign(camp.id);
      setFeedback({ type: 'success', message: `Duplicated into ${res.data?.code} as DRAFT!` });
      await loadData();
    } catch (err) {
      alert(`Duplicate error: ${err.message}`);
    }
  };

  // Open Performance Report Modal
  const handleOpenReport = async (camp) => {
    try {
      setLoadingReport(true);
      setReportModalOpen(true);
      const res = await ApiService.getCampaignReport(camp.id);
      setReportData(res.data);
    } catch (err) {
      alert(`Failed to load report: ${err.message}`);
      setReportModalOpen(false);
    } finally {
      setLoadingReport(false);
    }
  };

  // Download CSV Report
  const handleDownloadCsv = (campId) => {
    const token = ApiService.getToken();
    const url = `${ApiService.getApiBase()}/campaigns/${campId}/report?format=csv&token=${encodeURIComponent(token || '')}`;
    window.open(url, '_blank');
  };

  // Interactive Live Calculation Helper
  const liveCalcHelper = useMemo(() => {
    const sampleAmount = 100000;
    const stdPoints = 1000; // 1 point per 100 base
    const val = Number(formData.value || 0);
    let bonus = 0;

    if (formData.type === 'PCT_OF_STANDARD') {
      bonus = Math.floor((stdPoints * val) / 100);
    } else if (formData.type === 'FLAT_POINTS') {
      bonus = Math.floor(val);
    } else if (formData.type === 'EXTRA_PER_100') {
      bonus = Math.floor((sampleAmount * val) / 100);
    }

    if (formData.max_bonus_per_invoice !== '' && formData.max_bonus_per_invoice != null) {
      bonus = Math.min(bonus, Number(formData.max_bonus_per_invoice));
    }
    bonus = Math.max(0, bonus);
    const total = stdPoints + bonus;
    const rupeeValue = (total * 0.25).toFixed(2);

    return {
      sampleAmount,
      stdPoints,
      bonus,
      total,
      rupeeValue,
    };
  }, [formData.type, formData.value, formData.max_bonus_per_invoice]);

  // Run Test a Sale Simulator
  const handleRunSimulation = async (customInvoice = null) => {
    try {
      setSimulating(true);
      const invoiceData = customInvoice || {
        net_ex_showroom_price: Number(simForm.amount),
        brand: simForm.brand,
        model: simForm.model,
        branch_id: Number(simForm.branch_id),
        invoice_date: simForm.date,
        customer_tier: 'silver',
      };

      const payload = {
        invoice: invoiceData,
      };

      if (modalOpen) {
        payload.overrideCampaign = {
          ...formData,
          value: Number(formData.value),
          max_bonus_per_invoice: formData.max_bonus_per_invoice !== '' ? Number(formData.max_bonus_per_invoice) : null,
          min_spend: Number(formData.min_spend || 0),
          max_spend: formData.max_spend !== '' ? Number(formData.max_spend) : null,
          status: 'ACTIVE',
        };
      }

      const res = await ApiService.previewCampaignSimulation(payload);
      setSimResult(res.data || res);
    } catch (err) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  // Full editing freedom enabled (no input locks)
  const isEditingActive = false;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
              <Zap className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Campaign Add-on Engine (v2)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Promotional Campaign Add-ons
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Create time-boxed bonus multipliers for specific brands, models, branches, and date ranges without altering the standard policy engine.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={handleSyncDummyCustomers}
            disabled={syncingDummy}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
            title="Applies all active campaigns to dummy model customers so you can test them in Customer Search"
          >
            {syncingDummy ? <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> : <Zap className="w-4 h-4 text-slate-950" />}
            <span>Sync to Dummy Customers</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl text-xs font-bold border transition ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Campaigns</span>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <span className="text-[10px] text-slate-500">Configured campaigns</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Active Now</span>
          <div className="text-2xl font-black text-emerald-600">{stats.live}</div>
          <span className="text-[10px] text-emerald-700">Currently awarding bonuses</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bonus Points Issued</span>
          <div className="text-2xl font-black text-indigo-600 font-mono">
            {stats.totalBonus.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-indigo-700">₹{(stats.totalBonus * 0.25).toLocaleString('en-IN')} value</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Invoices Benefited</span>
          <div className="text-2xl font-black text-slate-900">{stats.totalInvoices}</div>
          <span className="text-[10px] text-slate-500">Sales &amp; invoices boosted</span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaign name, code, brand..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'LIVE', 'SCHEDULED', 'DRAFT', 'EXPIRED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL' ? 'All Campaigns' : st}
            </button>
          ))}
          <button
            type="button"
            onClick={loadData}
            title="Refresh list"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Campaign Name</th>
                <th className="py-3.5 px-4">Scope Summary</th>
                <th className="py-3.5 px-4">Dates &amp; Basis</th>
                <th className="py-3.5 px-4">Benefit</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Bonus Points</th>
                <th className="py-3.5 px-4 text-right">Invoices</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading campaigns...
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching campaigns found. Click &quot;Create Campaign&quot; to configure your first add-on.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => {
                  const badge = STATUS_BADGES[camp.status_derived || camp.derived_status] || STATUS_BADGES.DRAFT;
                  const bonusIssued = parseInt(camp.total_bonus_issued || camp.bonus_points_issued, 10) || 0;
                  const invoiceCount = parseInt(camp.invoices_benefited || camp.invoices_count, 10) || 0;
                  const startDate = camp.start_date_formatted || (camp.start_date ? camp.start_date.slice(0, 10) : '');
                  const endDate = camp.end_date_formatted || (camp.end_date ? camp.end_date.slice(0, 10) : '');

                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{camp.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{camp.name}</div>
                        {camp.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{camp.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800">{camp.brand}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">
                            {camp.all_models ? 'All Models' : (camp.models?.length ? `${camp.models.length} model(s)` : 'None')}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">
                            {camp.all_branches ? 'All Branches' : (camp.branches?.length ? `${camp.branches.length} branch(es)` : 'None')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[11px] font-mono text-slate-800">
                          {startDate} → {endDate}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          Counted on: {camp.date_basis}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-indigo-700">
                          {camp.type === 'PCT_OF_STANDARD' && `+${camp.value}% of Standard`}
                          {camp.type === 'FLAT_POINTS' && `+${camp.value} Flat Points`}
                          {camp.type === 'EXTRA_PER_100' && `+${camp.value} pts per ₹100`}
                        </div>
                        {camp.max_bonus_per_invoice && (
                          <div className="text-[10px] text-slate-400">Cap: {camp.max_bonus_per_invoice} pts</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {bonusIssued.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {invoiceCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(camp)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                            title="Edit Campaign"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {camp.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleActivate(camp)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition"
                              title="Activate Campaign"
                            >
                              Activate
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenReport(camp)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                            title="Performance & Liability Report"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(camp)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                            title="Duplicate as Draft"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {camp.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handleCancel(camp)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                              title="Cancel Campaign"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* ── INTERACTIVE SALE & CAMPAIGN SIMULATOR PANEL (DOWN ON PAGE) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Receipt className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Interactive Sale &amp; Campaign Simulator
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Test how standard policy points + active campaign bonus points calculate in real time. Perfect for demonstrating to management.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncDummyCustomers}
            disabled={syncingDummy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {syncingDummy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>Sync Live Campaigns to Dummy Customers</span>
          </button>
        </div>

        {/* Quick Model Presets Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-xs font-black text-slate-600 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>1-Click Model Presets:</span>
          </span>
          {[
            { label: 'Hero Splendor Plus', brand: 'Hero', model: 'SPLENDOR+', amount: 80000, branch: 5 },
            { label: 'Hero HF Deluxe', brand: 'Hero', model: 'HF DELUXE', amount: 65000, branch: 5 },
            { label: 'Tata Nexon', brand: 'Tata', model: 'NEXON', amount: 900000, branch: 3 },
            { label: 'Tata Punch', brand: 'Tata', model: 'PUNCH', amount: 650000, branch: 3 },
            { label: 'Tata Harrier', brand: 'Tata', model: 'HARRIER', amount: 1800000, branch: 10 },
            { label: 'Hyundai Creta', brand: 'Hyundai', model: 'New Creta', amount: 1100000, branch: 4 },
            { label: 'Hyundai Venue', brand: 'Hyundai', model: 'Venue', amount: 850000, branch: 4 },
            { label: 'Ather 450X', brand: 'Ather', model: 'ATHER 450X HR', amount: 150000, branch: 1 },
            { label: 'MG Windsor EV', brand: 'MG MOTORS', model: 'WINDSOR EV', amount: 1400000, branch: 7 },
            { label: 'Swaraj 742', brand: 'Swaraj', model: '742', amount: 680000, branch: 9 },
          ].map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const inv = {
                  amount: preset.amount,
                  brand: preset.brand,
                  model: preset.model,
                  branch_id: preset.branch,
                  date: new Date().toISOString().slice(0, 10),
                };
                setSimForm(inv);
                handleRunSimulation({
                  net_ex_showroom_price: preset.amount,
                  brand: preset.brand,
                  model: preset.model,
                  branch_id: preset.branch,
                  invoice_date: new Date().toISOString().slice(0, 10),
                  customer_tier: 'silver',
                });
              }}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 text-[11px] font-bold text-slate-700 transition shadow-2xs cursor-pointer"
            >
              {preset.label} (₹{preset.amount >= 100000 ? `${preset.amount / 100000}L` : `${preset.amount / 1000}k`})
            </button>
          ))}
        </div>

        {/* Demo Customer Alert / Quick Reference */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/60 via-indigo-50/40 to-slate-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center shrink-0">
              Demo
            </div>
            <div>
              <div className="font-black text-slate-900 flex items-center gap-2">
                <span>17 Sandbox Customers Ready in Customer Search:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700">Keyword: "Dummy"</span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Every vehicle model has a dedicated test customer named <code>Dummy - &lt;Model&gt;</code>. Active campaigns instantly calculate bonus points on their model. Real customers are 100% protected and untouched!
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 font-bold text-indigo-700 whitespace-nowrap text-[11px]">
            <span>17 Models Active</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </span>
        </div>

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Inputs Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Net Ex-Showroom / Bill (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={simForm.amount}
                  onChange={(e) => setSimForm({ ...simForm, amount: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                  placeholder="80000"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Vehicle Brand *
                </label>
                <select
                  value={simForm.brand}
                  onChange={(e) => setSimForm({ ...simForm, brand: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                >
                  {lookups.brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Model Name *
                </label>
                <input
                  type="text"
                  value={simForm.model}
                  onChange={(e) => setSimForm({ ...simForm, model: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition shadow-2xs"
                  placeholder="Splendor Plus"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Branch / Dealership *
                </label>
                <select
                  value={simForm.branch_id}
                  onChange={(e) => setSimForm({ ...simForm, branch_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                >
                  {lookups.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-slate-400">
                Transaction Date: <strong className="text-slate-700 font-mono">{simForm.date}</strong>
              </div>
              <button
                type="button"
                onClick={() => handleRunSimulation()}
                disabled={simulating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {simulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                <span>Calculate &amp; Preview Points</span>
              </button>
            </div>
          </div>

          {/* Real-time Results Column */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Simulation Outcome
              </span>
              <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                Live Engine Breakdown
              </span>
            </div>

            {simResult ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Standard Loyalty Policy:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{simResult.standard_points?.toLocaleString('en-IN')} PTS</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Campaign Bonus Add-on:</span>
                    </span>
                    <span className="font-mono font-black text-emerald-700 text-sm">+{simResult.bonus_points?.toLocaleString('en-IN')} PTS</span>
                  </div>
                  {simResult.campaigns_applied?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {simResult.campaigns_applied.map((ca, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] text-slate-600">
                          <span className="truncate pr-2 font-medium">↳ {ca.campaign_name}</span>
                          <span className="font-mono font-bold text-emerald-600">+{ca.bonus_points} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">Total Points Credited</span>
                    <div className="text-2xl font-black font-mono mt-0.5">
                      {simResult.total_points?.toLocaleString('en-IN')} <span className="text-xs font-normal text-indigo-300">PTS</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">Redemption Value</span>
                    <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                      ₹{((simResult.total_points || 0) * 0.25).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[9px] text-slate-400">@ 4 pts = ₹1</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <Receipt className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                <p className="font-bold text-slate-600">No simulation run yet</p>
                <p>Click &quot;Load Demo Customer&quot; above to preview calculation</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {editingCampaign ? 'Edit Campaign Add-on' : 'Create Campaign Add-on'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-medium">Auto Code:</span>
                    <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {formData.code || 'CAMP-AUTO'}
                    </span>
                    {isEditingActive && (
                      <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Active Locked: Core eligibility parameters are locked to maintain audit integrity
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overlap Warnings Banner */}
            {overlapWarnings.length > 0 && (
              <div className="mx-7 mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Potential Overlap Detected</span>
                </div>
                {overlapWarnings.map((w, idx) => (
                  <p key={idx} className="text-xs text-amber-800">{w.message}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleSave} className="p-7 space-y-6">
              {/* 2-Column Layout */}
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

                  {/* Campaign Type */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      Campaign Type *
                    </label>
                    <select
                      disabled={isEditingActive}
                      value={formData.type}
                      onChange={(e) => handleChange('type', e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="PCT_OF_STANDARD">+% of Standard Points (e.g. +25% bonus)</option>
                      <option value="FLAT_POINTS">Flat Bonus Points (e.g. 500 flat pts)</option>
                      <option value="EXTRA_PER_100">Extra Points per Rs.100 Spend (e.g. +2 pts per Rs.100)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Determines how the bonus amount is calculated on top of standard policy points.
                    </span>
                  </div>

                  {/* Code & Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Campaign Code *</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.code}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-xs text-slate-700 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Campaign Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="e.g. Christmas Hero Splendor Bonus"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                  </div>

                  {/* Vehicle Type & Spend Category */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Vehicle Type *</label>
                      <select
                        disabled={isEditingActive}
                        value={formData.vehicle_type}
                        onChange={(e) => handleChange('vehicle_type', e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                      >
                        <option value="2W">Two-Wheeler (2W)</option>
                        <option value="4W">Four-Wheeler (4W)</option>
                        <option value="ALL">All Vehicle Types</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Spend Category *</label>
                      <select
                        disabled={isEditingActive}
                        value={formData.spend_category}
                        onChange={(e) => handleChange('spend_category', e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                      >
                        <option value="sale">Vehicle Sales</option>
                        <option value="service">Routine Service</option>
                        <option value="bodyshop">Bodyshop &amp; Accidental</option>
                        <option value="accessories">Genuine Accessories</option>
                        <option value="spares">Spare Parts</option>
                        <option value="ALL">All Spend Categories</option>
                      </select>
                    </div>
                  </div>

                  {/* Brand & Customer Priority Tier */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Brand Name *</label>
                      <select
                        disabled={isEditingActive}
                        value={formData.brand}
                        onChange={(e) => handleChange('brand', e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                      >
                        <option value="ALL">All Brands (ALL)</option>
                        {lookups.brands.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Customer Priority Tier</label>
                      <select
                        disabled={isEditingActive}
                        value={formData.customer_tier}
                        onChange={(e) => handleChange('customer_tier', e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                      >
                        <option value="ALL">All Customers (Standard)</option>
                        <option value="silver">Silver Tier</option>
                        <option value="gold">Gold VIP</option>
                        <option value="platinum">Platinum / VIP</option>
                      </select>
                    </div>
                  </div>

                  {/* Models Multi-Select */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        Target Models
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-700">
                        <input
                          type="checkbox"
                          disabled={isEditingActive}
                          checked={formData.all_models}
                          onChange={(e) => handleChange('all_models', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>All models</span>
                      </label>
                    </div>

                    {!formData.all_models && (
                      <>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            placeholder="Filter models list..."
                            className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                          />
                          <button
                            type="button"
                            disabled={isEditingActive}
                            onClick={() => handleChange('models', lookups.models)}
                            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold text-slate-700"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            disabled={isEditingActive}
                            onClick={() => handleChange('models', [])}
                            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold text-slate-700"
                          >
                            Clear
                          </button>
                        </div>

                        <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 grid grid-cols-2 gap-1.5">
                          {lookups.models
                            .filter((m) => !modelSearch || m.toLowerCase().includes(modelSearch.toLowerCase()))
                            .map((m) => {
                              const checked = formData.models.includes(m);
                              return (
                                <label
                                  key={m}
                                  className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs cursor-pointer select-none transition ${
                                    checked ? 'bg-indigo-50 font-bold text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={isEditingActive}
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...formData.models, m]
                                        : formData.models.filter((x) => x !== m);
                                      handleChange('models', next);
                                    }}
                                    className="rounded text-indigo-600"
                                  />
                                  <span className="truncate">{m}</span>
                                </label>
                              );
                            })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Branches Multi-Select */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        Target Dealership Branches
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-700">
                        <input
                          type="checkbox"
                          disabled={isEditingActive}
                          checked={formData.all_branches}
                          onChange={(e) => handleChange('all_branches', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>All branches</span>
                      </label>
                    </div>

                    {!formData.all_branches && (
                      <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {lookups.branches.map((b) => {
                          const checked = formData.branches.includes(Number(b.id));
                          return (
                            <label
                              key={b.id}
                              className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs cursor-pointer select-none transition ${
                                checked ? 'bg-indigo-50 font-bold text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={isEditingActive}
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...formData.branches, Number(b.id)]
                                    : formData.branches.filter((x) => x !== Number(b.id));
                                  handleChange('branches', next);
                                }}
                                className="rounded text-indigo-600"
                              />
                              <span className="truncate">{b.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Director Notes</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder="e.g. End of year promotional push approved by BOD"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                    />
                  </div>
                </div>

                {/* ── COL 2: PERIOD, BENEFIT AND RULES ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                      2
                    </span>
                    <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                      Period, Benefit &amp; Calculation Rules
                    </h4>
                  </div>

                  {/* Date Range & Basis */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">Start Date *</label>
                        <input
                          type="date"
                          required
                          disabled={isEditingActive}
                          value={formData.start_date}
                          onChange={(e) => handleChange('start_date', e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">End Date *</label>
                        <input
                          type="date"
                          required
                          value={formData.end_date}
                          onChange={(e) => handleChange('end_date', e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">Date Counted On *</label>
                      <select
                        disabled={isEditingActive}
                        value={formData.date_basis}
                        onChange={(e) => handleChange('date_basis', e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                      >
                        <option value="INVOICE">DMS Invoice Date (Default)</option>
                        <option value="BOOKING">Customer Booking Date</option>
                        <option value="DELIVERY">Vehicle Delivery Date</option>
                      </select>
                    </div>
                  </div>

                  {/* Spend Range Min & Max */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Min Spend (₹)</label>
                      <input
                        type="number"
                        min="0"
                        disabled={isEditingActive}
                        value={formData.min_spend}
                        onChange={(e) => handleChange('min_spend', e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Max Spend (₹) (Blank = No Limit)</label>
                      <input
                        type="number"
                        min="0"
                        disabled={isEditingActive}
                        value={formData.max_spend}
                        onChange={(e) => handleChange('max_spend', e.target.value)}
                        placeholder="∞ Unlimited"
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  {/* Benefit Value & Max Bonus Cap */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        Benefit Value * ({formData.type === 'PCT_OF_STANDARD' ? '%' : 'Points'})
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        disabled={isEditingActive}
                        value={formData.value}
                        onChange={(e) => handleChange('value', e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Max Bonus Cap / Invoice</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.max_bonus_per_invoice}
                        onChange={(e) => handleChange('max_bonus_per_invoice', e.target.value)}
                        placeholder="No Cap"
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                  </div>

                  {/* Stacking & Priority */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Stacking Rule</label>
                      <select
                        disabled={isEditingActive}
                        value={formData.stacking}
                        onChange={(e) => handleChange('stacking', e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition disabled:bg-slate-100"
                      >
                        <option value="STACK">Stack (Add on top of other campaigns)</option>
                        <option value="HIGHEST_ONLY">Highest Only (Apply only if highest bonus)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">Priority (Lower = First)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.priority}
                        onChange={(e) => handleChange('priority', e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                  </div>

                  {/* Live Calculation Helper */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Live Calculation Helper</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      For a sample <strong>₹{liveCalcHelper.sampleAmount.toLocaleString('en-IN')}</strong> Net Ex-Showroom spend (standard: {liveCalcHelper.stdPoints.toLocaleString('en-IN')} pts), this campaign adds{' '}
                      <strong className="text-emerald-700 font-mono">+{liveCalcHelper.bonus.toLocaleString('en-IN')} bonus pts</strong> → total{' '}
                      <strong className="text-indigo-900 font-mono">{liveCalcHelper.total.toLocaleString('en-IN')} points</strong> (₹{liveCalcHelper.rupeeValue} cash value).
                    </p>
                  </div>

                  {/* Test a Sale Simulator Panel */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase">
                        <Receipt className="w-4 h-4 text-indigo-600" />
                        <span>Test a Sale Simulator</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRunSimulation}
                        disabled={simulating}
                        className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition flex items-center gap-1 disabled:opacity-50"
                      >
                        {simulating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                        <span>Run Test</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Net Ex-Showroom (₹)</span>
                        <input
                          type="number"
                          value={simForm.amount}
                          onChange={(e) => setSimForm({ ...simForm, amount: e.target.value })}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Brand</span>
                        <input
                          type="text"
                          value={simForm.brand}
                          onChange={(e) => setSimForm({ ...simForm, brand: e.target.value })}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      </div>
                    </div>

                    {simResult && (
                      <div className="p-3 rounded-xl bg-white border border-indigo-200 text-xs space-y-1">
                        <div className="flex justify-between font-mono">
                          <span className="text-slate-500">Standard Points:</span>
                          <span className="font-bold text-slate-900">{simResult.standard_points} pts</span>
                        </div>
                        <div className="flex justify-between font-mono">
                          <span className="text-emerald-700 font-bold">Campaign Bonus:</span>
                          <span className="font-bold text-emerald-700">+{simResult.bonus_points} pts</span>
                        </div>
                        <div className="flex justify-between font-mono pt-1 border-t border-slate-100">
                          <span className="font-black text-slate-900">Total Awarded:</span>
                          <span className="font-black text-indigo-700">{simResult.total_points} pts (₹{(simResult.total_points * 0.25).toFixed(2)})</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCampaign ? 'Update Campaign' : 'Save as Draft'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PERFORMANCE & LIABILITIES REPORT MODAL ── */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Campaign Performance &amp; Liabilities
                  </h3>
                  <div className="text-xs text-slate-500">
                    {reportData?.campaign?.name} ({reportData?.campaign?.code})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {reportData?.campaign?.id && (
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv(reportData.campaign.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-7 space-y-6">
              {loadingReport ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  Generating report...
                </div>
              ) : !reportData ? (
                <div className="py-12 text-center text-slate-400">No report data available.</div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Bonus Issued</span>
                      <span className="text-2xl font-black text-indigo-600 font-mono">
                        {reportData.summary.total_bonus_points_issued?.toLocaleString('en-IN')} pts
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Financial Liability</span>
                      <span className="text-2xl font-black text-emerald-600 font-mono">
                        ₹{reportData.summary.financial_liability_rupees?.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400 block">@ 4 points = ₹1</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Invoices Benefited</span>
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {reportData.summary.invoices_benefited}
                      </span>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
                      Benefited Invoices &amp; Customers ({reportData.transactions?.length || 0})
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Invoice / Ref</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Branch</th>
                            <th className="py-2.5 px-3 text-right">Bonus Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                          {reportData.transactions?.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                                No invoices have been processed under this campaign yet.
                              </td>
                            </tr>
                          ) : (
                            reportData.transactions?.map((tx, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2 px-3 text-slate-600 font-sans">
                                  {new Date(tx.created_at).toLocaleDateString('en-IN')}
                                </td>
                                <td className="py-2 px-3 font-bold text-slate-900">{tx.source_ref}</td>
                                <td className="py-2 px-3 font-sans text-slate-800">{tx.customer_name || tx.customer_id}</td>
                                <td className="py-2 px-3 font-sans text-slate-600">{tx.branch_name || tx.branch_id}</td>
                                <td className="py-2 px-3 text-right font-bold text-emerald-700">+{tx.points} pts</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
