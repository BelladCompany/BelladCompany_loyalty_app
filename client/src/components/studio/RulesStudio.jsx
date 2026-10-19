import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Car,
  Bike,
  Wrench,
  ShoppingBag,
  Coins,
  Star,
  Gift,
  Building2,
  ChevronDown,
  Globe,
  Save,
  Send,
  History,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';
import ApiService from '../../services/api';

// Native Bilingual i18n Dictionary (English & Kannada)
const DICTIONARY = {
  'en-IN': {
    studio_title: 'Loyalty Rules Engine Studio',
    studio_subtitle: 'Data-driven rule authoring, real-time live simulation, and instant version rollback.',
    live_sync: 'Live Sync Active (SSE)',
    connecting: 'Connecting...',
    published: 'Published',
    draft: 'Draft (Unpublished)',
    archived: 'Archived',
    version: 'Version',
    save_draft: 'Save Draft',
    publish_live: 'Publish Live (<1s)',
    rollback_btn: 'Rollback',
    history: 'Version History',
    simulator: 'Live Bill Simulator',
    rule_builder: 'Rules Catalog',
    add_rule: 'Add New Rule',
    active_rules: 'Active Rules',
    total_versions: 'Total Versions',
    rule_name: 'Rule Name',
    event_type: 'Event Type',
    priority: 'Priority Weight',
    conditions: 'Conditions & Scope',
    actions: 'Reward & Discount Action',
    discount: 'Discount',
    points_earning: 'Points Earning',
    multiplier: 'Rate Multiplier',
    bonus_points: 'Flat Bonus Points',
    spend_amount: 'Bill Amount (₹)',
    sim_result: 'Simulation Breakdown',
    winning_rule: 'Matched Rule',
    total_points: 'Total Points',
    points_value: 'Cash Equivalent',
    step_trace: 'Evaluation Trace',
    customer_tier: 'Customer Tier',
    branch: 'Branch',
    model: 'Vehicle Model',
    save_success: 'Draft ruleset saved successfully.',
    publish_success: 'Ruleset published live! Connected frontends updated.',
    rollback_success: 'Rolled back successfully.',
  },
  'kn-IN': {
    studio_title: 'ಲಾಯಲ್ಟಿ ನಿಯಮಗಳ ಸ್ಟುಡಿಯೋ',
    studio_subtitle: 'ಡೇಟಾ-ಚಾಲಿತ ನಿಯಮಗಳ ರಚನೆ, ನೈಜ-ಸಮಯದ ಸಿಮ್ಯುಲೇಶನ್ ಮತ್ತು ತತ್ಕ್ಷಣದ ಆವೃತ್ತಿ ಪ್ರಕಾಶನ.',
    live_sync: 'ಲೈವ್ ಸಿಂಕ್ ಸಕ್ರಿಯ (SSE)',
    connecting: 'ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...',
    published: 'ಪ್ರಕಟಿಸಲಾಗಿದೆ',
    draft: 'ಕರಡು (ಪ್ರಕಟಿಸದ)',
    archived: 'ಆರ್ಕೈವ್ ಮಾಡಲಾಗಿದೆ',
    version: 'ಆವೃತ್ತಿ',
    save_draft: 'ಕರಡು ಉಳಿಸಿ',
    publish_live: 'ಲೈವ್ ಪ್ರಕಟಿಸಿ (<1s)',
    rollback_btn: 'ಹಿಂದಿನ ಆವೃತ್ತಿಗೆ ಮರಳಿ',
    history: 'ಆವೃತ್ತಿ ಇತಿಹಾಸ',
    simulator: 'ಲೈವ್ ಬಿಲ್ ಸಿಮ್ಯುಲೇಟರ್',
    rule_builder: 'ನಿಯಮಗಳ ಪಟ್ಟಿ',
    add_rule: 'ಹೊಸ ನಿಯಮ ಸೇರಿಸಿ',
    active_rules: 'ಸಕ್ರಿಯ ನಿಯಮಗಳು',
    total_versions: 'ಒಟ್ಟು ಆವೃತ್ತಿಗಳು',
    rule_name: 'ನಿಯಮದ ಹೆಸರು',
    event_type: 'ಘಟನೆಯ ಪ್ರಕಾರ',
    priority: 'ಆದ್ಯತೆ ತೂಕ',
    conditions: 'ಷರತ್ತುಗಳು ಮತ್ತು ವ್ಯಾಪ್ತಿ',
    actions: 'ಪ್ರತಿಫಲ ಮತ್ತು ರಿಯಾಯಿತಿ',
    discount: 'ರಿಯಾಯಿತಿ',
    points_earning: 'ಅಂಕಗಳ ಗಳಿಕೆ',
    multiplier: 'ದರ ಗುಣಕ',
    bonus_points: 'ಬೋನಸ್ ಅಂಕಗಳು',
    spend_amount: 'ಬಿಲ್ ಮೊತ್ತ (₹)',
    sim_result: 'ಸಿಮ್ಯುಲೇಶನ್ ಫಲಿತಾಂಶ',
    winning_rule: 'ಹೊಂದಿಕೆಯಾದ ನಿಯಮ',
    total_points: 'ಒಟ್ಟು ಅಂಕಗಳು',
    points_value: 'ನಗದು ಮೌಲ್ಯ',
    step_trace: 'ಮೌಲ್ಯಮಾಪನ ಹಂತಗಳು',
    customer_tier: 'ಗ್ರಾಹಕರ ಶ್ರೇಣಿ',
    branch: 'ಶಾಖೆ',
    model: 'ವಾಹನದ ಮಾದರಿ',
    save_success: 'ಕರಡು ನಿಯಮಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ.',
    publish_success: 'ನಿಯಮಗಳನ್ನು ಲೈವ್ ಪ್ರಕಟಿಸಲಾಗಿದೆ! ಕೌಂಟರ್ ಅಪ್ಲಿಕೇಶನ್ ನವೀಕರಿಸಲಾಗಿದೆ.',
    rollback_success: 'ಹಿಂದಿನ ಆವೃತ್ತಿಗೆ ಯಶಸ್ವಿಯಾಗಿ ಹಿಂತಿರುಗಿಸಲಾಗಿದೆ.',
  },
};

export default function RulesStudio({ user, tenantId = 'bellad_and_company' }) {
  // Locale State
  const [lang, setLang] = useState('en-IN');
  const t = DICTIONARY[lang] || DICTIONARY['en-IN'];

  // Ruleset & Versions State
  const [activeVersionData, setActiveVersionData] = useState(null);
  const [versionsList, setVersionsList] = useState([]);
  const [currentRuleset, setCurrentRuleset] = useState(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // SSE Realtime State
  const [sseConnected, setSseConnected] = useState(false);

  // Simulator State
  const [simContext, setSimContext] = useState({
    event_type: 'service',
    spend_amount: 15000,
    vehicle_type: '4W',
    brand_name: 'Tata Motors',
    model_name: 'Nexon',
    branch_name: 'Hubli',
    customer_tier: 'Gold',
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Selected Rule for Visual Editing
  const [selectedRuleId, setSelectedRuleId] = useState(null);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Load Active Ruleset & Version History
  const loadStudioData = useCallback(async () => {
    try {
      setLoading(true);
      const [activeRes, versionsRes] = await Promise.all([
        ApiService.getPlatformActiveRules(tenantId),
        ApiService.getPlatformVersions(tenantId),
      ]);

      if (activeRes && activeRes.data) {
        setActiveVersionData(activeRes.data);
        setCurrentRuleset(JSON.parse(JSON.stringify(activeRes.data.ruleset)));
        if (activeRes.data.ruleset.rules?.length > 0) {
          setSelectedRuleId(activeRes.data.ruleset.rules[0].rule_id);
        }
      }

      if (versionsRes && versionsRes.data) {
        setVersionsList(versionsRes.data.versions || []);
      }
    } catch (err) {
      console.error('Error loading studio data:', err);
      showToast(err.message || 'Failed to load studio data', true);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadStudioData();
  }, [loadStudioData]);

  // 2. Real-Time SSE Listener
  useEffect(() => {
    const rawApi = import.meta.env.VITE_API_URL || '/api';
    const sseUrl = `${rawApi}/v1/platform/rules/stream?tenant_id=${encodeURIComponent(tenantId)}`;

    let eventSource;
    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'RULESET_UPDATED' && payload.tenant_id === tenantId) {
            console.log('⚡ Real-time ruleset push received via SSE:', payload);
            loadStudioData();
            showToast(`Real-Time Update: Version ${payload.version} published live!`);
          }
        } catch (e) {
          // Keep-alive or ping
        }
      };

      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch (err) {
      console.warn('SSE connection failed:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [tenantId, loadStudioData]);

  // 3. Live Simulation Trigger (auto-runs when context or rules change)
  const triggerSimulation = useCallback(async () => {
    if (!currentRuleset) return;
    try {
      setSimLoading(true);
      const res = await ApiService.simulatePlatformRules({
        tenant_id: tenantId,
        customer_profile: { current_tier: simContext.customer_tier },
        transaction_context: simContext,
        ruleset_override: currentRuleset,
      });
      if (res && res.data) {
        setSimResult(res.data);
      }
    } catch (err) {
      console.warn('Simulation error:', err);
    } finally {
      setSimLoading(false);
    }
  }, [simContext, currentRuleset, tenantId]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      triggerSimulation();
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [triggerSimulation]);

  // 4. Save Draft Action
  const handleSaveDraft = async () => {
    if (!currentRuleset) return;
    try {
      setActionLoading(true);
      const res = await ApiService.savePlatformDraft({
        tenant_id: tenantId,
        ruleset: currentRuleset,
        release_notes: `Studio draft update by ${user?.username || 'admin'}`,
      });
      if (res && res.data) {
        showToast(t.save_success);
        setHasUnpublishedChanges(true);
        loadStudioData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save draft', true);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Publish Live Action (<1s)
  const handlePublishLive = async () => {
    try {
      setActionLoading(true);
      // First ensure latest draft is saved
      const draftRes = await ApiService.savePlatformDraft({
        tenant_id: tenantId,
        ruleset: currentRuleset,
        release_notes: `Live publish from Studio by ${user?.username || 'admin'}`,
      });

      const versionToPublish = draftRes.data.version_number;

      const pubRes = await ApiService.publishPlatformRules(versionToPublish, tenantId);
      if (pubRes && pubRes.data) {
        showToast(t.publish_success);
        setHasUnpublishedChanges(false);
        loadStudioData();
      }
    } catch (err) {
      showToast(err.message || 'Publish failed', true);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Rollback Action
  const handleRollback = async (targetVersionNum) => {
    if (!window.confirm(`Are you sure you want to rollback to Version ${targetVersionNum}? A new published version will be generated.`)) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await ApiService.rollbackPlatformRules(targetVersionNum, tenantId);
      if (res && res.data) {
        showToast(`Rolled back to v${targetVersionNum} (Published as v${res.data.version_number})`);
        setHasUnpublishedChanges(false);
        loadStudioData();
      }
    } catch (err) {
      showToast(err.message || 'Rollback failed', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Rule Form Mutators
  const updateSelectedRule = (fieldPath, value) => {
    if (!currentRuleset || !selectedRuleId) return;

    setCurrentRuleset((prev) => {
      const cloned = JSON.parse(JSON.stringify(prev));
      const targetRule = cloned.rules.find((r) => r.rule_id === selectedRuleId);
      if (!targetRule) return prev;

      if (fieldPath === 'rule_name') targetRule.rule_name = value;
      else if (fieldPath === 'priority_weight') targetRule.priority_weight = parseInt(value, 10) || 100;
      else if (fieldPath === 'event_type') targetRule.event_type = value;
      else if (fieldPath === 'is_active') targetRule.is_active = value;
      else if (fieldPath.startsWith('action.discount.')) {
        const key = fieldPath.replace('action.discount.', '');
        if (!targetRule.action) targetRule.action = {};
        if (!targetRule.action.discount) targetRule.action.discount = { type: 'none', value: 0 };
        targetRule.action.discount[key] = value;
      } else if (fieldPath.startsWith('action.points_earning.')) {
        const key = fieldPath.replace('action.points_earning.', '');
        if (!targetRule.action) targetRule.action = {};
        if (!targetRule.action.points_earning) targetRule.action.points_earning = { multiplier_numerator: 1, multiplier_denominator: 100 };
        targetRule.action.points_earning[key] = value;
      }

      setHasUnpublishedChanges(true);
      return cloned;
    });
  };

  const handleAddNewRule = () => {
    const newId = `rule_${Date.now()}`;
    const newRule = {
      rule_id: newId,
      rule_name: 'New Custom Incentive Rule',
      priority_weight: 150,
      event_type: 'service',
      is_active: true,
      conditions: { vehicle_types: ['ALL'], brands: ['ALL'], branches: ['ALL'], customer_tiers: ['ALL'] },
      action: {
        discount: { type: 'none', value: 0, deduct_from_points_base: true },
        points_earning: { formula_basis: 'bill_amount', multiplier_numerator: 4, multiplier_denominator: 100, bonus_points: 0 },
      },
    };

    setCurrentRuleset((prev) => {
      const cloned = JSON.parse(JSON.stringify(prev));
      cloned.rules.push(newRule);
      return cloned;
    });
    setSelectedRuleId(newId);
    setHasUnpublishedChanges(true);
  };

  const handleDeleteRule = (ruleId) => {
    if (!window.confirm('Are you sure you want to remove this rule?')) return;
    setCurrentRuleset((prev) => {
      const cloned = JSON.parse(JSON.stringify(prev));
      cloned.rules = cloned.rules.filter((r) => r.rule_id !== ruleId);
      return cloned;
    });
    if (selectedRuleId === ruleId) {
      setSelectedRuleId(currentRuleset?.rules?.[0]?.rule_id || null);
    }
    setHasUnpublishedChanges(true);
  };

  const activeRule = useMemo(() => {
    return currentRuleset?.rules?.find((r) => r.rule_id === selectedRuleId) || null;
  }, [currentRuleset, selectedRuleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wide">Loading Rules Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* ─── TOAST NOTIFICATION ────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium shadow-2xl backdrop-blur-md transition-all ${
          toast.isError
            ? 'bg-rose-950/90 border-rose-800 text-rose-200'
            : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
        }`}>
          {toast.isError ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── TOP ACTION & HEADER BAR (Linear Standard) ──────────────────── */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-100 tracking-tight">{t.studio_title}</h1>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                Tenant: {tenantId}
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">{t.studio_subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Sync Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{sseConnected ? t.live_sync : t.connecting}</span>
          </div>

          {/* Language Switcher (EN / Kannada) */}
          <button
            onClick={() => setLang(lang === 'en-IN' ? 'kn-IN' : 'en-IN')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            title="Toggle English / Kannada"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{lang === 'en-IN' ? 'English' : 'ಕನ್ನಡ'}</span>
          </button>

          {/* Save Draft Button */}
          <button
            onClick={handleSaveDraft}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.save_draft}</span>
          </button>

          {/* Publish Live Button (<1s) */}
          <button
            onClick={handlePublishLive}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t.publish_live}</span>
          </button>
        </div>
      </header>

      {/* ─── MAIN 3-PANEL DENSE LAYOUT ───────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL 1: Rules List & Version History (Left, 320px) */}
        <aside className="w-80 border-r border-slate-800/80 bg-slate-900/40 flex flex-col shrink-0">
          {/* Version Header Card */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>ACTIVE VERSION</span>
              <span className="font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> v{activeVersionData?.version_number} Published
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                {currentRuleset?.rules?.length || 0} {t.active_rules}
              </span>
              <button
                onClick={handleAddNewRule}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>{t.add_rule}</span>
              </button>
            </div>
          </div>

          {/* Rule Item Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {currentRuleset?.rules?.map((rule) => {
              const isSelected = rule.rule_id === selectedRuleId;
              return (
                <div
                  key={rule.rule_id}
                  onClick={() => setSelectedRuleId(rule.rule_id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500/50 shadow-md text-slate-100'
                      : 'bg-slate-900/50 border-slate-800/60 hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700/60">
                      {rule.event_type}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Weight: {rule.priority_weight}
                    </span>
                  </div>
                  <div className="text-xs font-medium truncate">{rule.rule_name}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>
                      {rule.action?.points_earning?.multiplier_numerator}/
                      {rule.action?.points_earning?.multiplier_denominator} pts
                      {rule.action?.points_earning?.bonus_points > 0 && ` + ${rule.action.points_earning.bonus_points} bonus`}
                    </span>
                    {rule.action?.discount?.value > 0 && (
                      <span className="text-amber-400">
                        {rule.action.discount.value}% off
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Version Rollback Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <History className="w-3.5 h-3.5" /> {t.history}
              </span>
              <span>{versionsList.length} total</span>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
              {versionsList.slice(0, 4).map((v) => (
                <div key={v.version_id} className="flex items-center justify-between py-1 px-2 rounded bg-slate-800/50 text-slate-300">
                  <span className="font-mono">v{v.version_number} ({v.status})</span>
                  {v.version_number !== activeVersionData?.version_number && (
                    <button
                      onClick={() => handleRollback(v.version_number)}
                      disabled={actionLoading}
                      className="text-blue-400 hover:text-blue-300 text-[11px] font-medium"
                    >
                      {t.rollback_btn}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* PANEL 2: Rule Form Builder (Center, flex-1) */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeRule ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Rule Title & Event Type */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Rule Identification & Category
                  </span>
                  <button
                    onClick={() => handleDeleteRule(activeRule.rule_id)}
                    className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Rule
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">{t.rule_name}</label>
                    <input
                      type="text"
                      value={activeRule.rule_name}
                      onChange={(e) => updateSelectedRule('rule_name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">{t.event_type}</label>
                    <select
                      value={activeRule.event_type}
                      onChange={(e) => updateSelectedRule('event_type', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="sale">Vehicle / Equip. Sales</option>
                      <option value="service">Workshop Service</option>
                      <option value="accessory">Accessories</option>
                      <option value="bodyshop">Bodyshop</option>
                      <option value="referral">Customer Referral</option>
                      <option value="bonus">Incentive / Bonus</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-slate-200">Rule Active Toggle</span>
                    <p className="text-[11px] text-slate-400">Controls whether this rule is evaluated during billing</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeRule.is_active !== false}
                    onChange={(e) => updateSelectedRule('is_active', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

              {/* Reward & Discount Action Section */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {t.actions}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Points Earning Formula */}
                  <div className="space-y-3 p-4 rounded-lg bg-slate-850/60 border border-slate-800">
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5" /> Points Earning Formula
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400">Numerator (pts)</label>
                        <input
                          type="number"
                          value={activeRule.action?.points_earning?.multiplier_numerator ?? 1}
                          onChange={(e) => updateSelectedRule('action.points_earning.multiplier_numerator', parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400">Denominator (₹)</label>
                        <input
                          type="number"
                          value={activeRule.action?.points_earning?.multiplier_denominator ?? 100}
                          onChange={(e) => updateSelectedRule('action.points_earning.multiplier_denominator', parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400">{t.bonus_points}</label>
                      <input
                        type="number"
                        value={activeRule.action?.points_earning?.bonus_points ?? 0}
                        onChange={(e) => updateSelectedRule('action.points_earning.bonus_points', parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Bill Discount Section */}
                  <div className="space-y-3 p-4 rounded-lg bg-slate-850/60 border border-slate-800">
                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Instant Bill Discount
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400">Discount Type</label>
                        <select
                          value={activeRule.action?.discount?.type || 'none'}
                          onChange={(e) => updateSelectedRule('action.discount.type', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-100"
                        >
                          <option value="none">No Discount</option>
                          <option value="percentage">Percentage (%)</option>
                          <option value="flat_rupees">Flat Rupees (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400">Discount Value</label>
                        <input
                          type="number"
                          value={activeRule.action?.discount?.value ?? 0}
                          onChange={(e) => updateSelectedRule('action.discount.value', parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400">Max Cap (in Paise, optional)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500000 for ₹15,000"
                        value={activeRule.action?.discount?.max_cap_paise ?? ''}
                        onChange={(e) => updateSelectedRule('action.discount.max_cap_paise', e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority & Specificity Weight */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Conflict Resolution Priority
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={activeRule.priority_weight || 100}
                      onChange={(e) => updateSelectedRule('priority_weight', e.target.value)}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <span className="w-16 px-2.5 py-1 rounded bg-slate-800 text-center font-mono text-sm text-blue-400 border border-slate-700">
                    {activeRule.priority_weight || 100}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Higher priority integers take precedence when multiple rules match the same transaction.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Select or add a rule on the left panel to begin editing.
            </div>
          )}
        </main>

        {/* PANEL 3: Live Simulator Panel (Right, 360px) */}
        <aside className="w-96 border-l border-slate-800/80 bg-slate-900/50 p-5 flex flex-col shrink-0 overflow-y-auto space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
              {t.simulator}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {simResult?.execution_ms ?? 0} ms
            </span>
          </div>

          {/* Test Bill Controls */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400">{t.spend_amount}</label>
              <input
                type="number"
                value={simContext.spend_amount}
                onChange={(e) => setSimContext({ ...simContext, spend_amount: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400">{t.event_type}</label>
                <select
                  value={simContext.event_type}
                  onChange={(e) => setSimContext({ ...simContext, event_type: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200"
                >
                  <option value="sale">Sale</option>
                  <option value="service">Service</option>
                  <option value="accessory">Accessories</option>
                  <option value="bodyshop">Bodyshop</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400">{t.customer_tier}</label>
                <select
                  value={simContext.customer_tier}
                  onChange={(e) => setSimContext({ ...simContext, customer_tier: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200"
                >
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400">{t.model}</label>
                <input
                  type="text"
                  value={simContext.model_name}
                  onChange={(e) => setSimContext({ ...simContext, model_name: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400">{t.branch}</label>
                <input
                  type="text"
                  value={simContext.branch_name}
                  onChange={(e) => setSimContext({ ...simContext, branch_name: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Real-Time Outcome Breakdown */}
          {simResult && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-850/80 space-y-3">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                {t.sim_result}
              </span>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Discount Applied</span>
                  <span className="font-mono font-semibold text-amber-400">
                    -₹{simResult.summary?.discount_rupees?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Net Payable Basis</span>
                  <span className="font-mono font-semibold text-slate-200">
                    ₹{simResult.summary?.net_payable_rupees?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-medium">{t.total_points}</span>
                  <span className="font-mono font-bold text-base text-blue-400">
                    +{simResult.summary?.total_points_earned?.toLocaleString('en-IN') || 0} pts
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{t.points_value}</span>
                  <span>₹{simResult.summary?.points_rupee_value?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              {simResult.applied_rule && (
                <div className="mt-3 p-2 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">{t.winning_rule}</span>
                  <span className="font-semibold text-blue-300">{simResult.applied_rule.rule_name}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Score: {simResult.applied_rule.score}</span>
                </div>
              )}
            </div>
          )}

          {/* Audit Candidate Steps Trace */}
          {simResult?.steps && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                {t.step_trace}
              </span>
              <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
                {simResult.steps[1]?.candidates?.map((c, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded text-[11px] border font-mono ${
                      c.is_match
                        ? 'bg-blue-950/30 border-blue-800/50 text-blue-300'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate max-w-[180px]">{c.rule_name}</span>
                      <span>Score: {c.score}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{c.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
