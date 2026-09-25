import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  PlusCircle,
  Users,
  Store,
  ShieldCheck,
  RefreshCw,
  Edit2,
  CheckCircle2,
  Sliders,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useToast, StatCard } from '../components/ui';
import ApiService from '../services/api';

export const TenantManagementScreen = ({ user }) => {
  const { showSuccess, showError } = useToast();

  const [firms, setFirms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState(null);

  // Form State for Onboarding New Client Firm
  const [tenantId, setTenantId] = useState('');
  const [firmName, setFirmName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [brandSlug, setBrandSlug] = useState('');
  const [themeColor, setThemeColor] = useState('#0f172a');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [pointRate, setPointRate] = useState('0.25');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [defaultBranchName, setDefaultBranchName] = useState('Main Showroom & Service Hub');
  const [defaultBranchCity, setDefaultBranchCity] = useState('Bangalore');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('Admin@123');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFirms = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await ApiService.getFirms();
      setFirms(res.data || []);
    } catch (err) {
      showError(err.message || 'Failed to load client firms.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFirms();
  }, [loadFirms]);

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId.trim() || !firmName.trim()) {
      showError('Tenant Code and Firm Name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiService.createFirm({
        tenant_id: tenantId,
        firm_name: firmName,
        legal_name: legalName || firmName,
        brand_slug: brandSlug || tenantId,
        theme_color: themeColor,
        accent_color: accentColor,
        point_to_rupee_rate: parseFloat(pointRate || '0.25'),
        contact_email: contactEmail,
        contact_phone: contactPhone,
        default_branch_name: defaultBranchName,
        default_branch_city: defaultBranchCity,
        admin_username: adminUsername || `${tenantId}_admin`,
        admin_password: adminPassword || 'Admin@123',
      });

      showSuccess(`Firm '${firmName}' onboarded successfully! Admin: ${res.data.admin_credentials.username}`);
      setOnboardModalOpen(false);
      // Reset form
      setTenantId('');
      setFirmName('');
      setLegalName('');
      setContactEmail('');
      setContactPhone('');
      loadFirms();
    } catch (err) {
      showError(err.message || 'Failed to onboard firm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFirm) return;

    setIsSubmitting(true);
    try {
      await ApiService.updateFirm(selectedFirm.tenant_id, {
        firm_name: selectedFirm.firm_name,
        legal_name: selectedFirm.legal_name,
        theme_color: selectedFirm.theme_color,
        accent_color: selectedFirm.accent_color,
        contact_email: selectedFirm.contact_email,
        contact_phone: selectedFirm.contact_phone,
      });

      showSuccess('Firm details updated successfully.');
      setEditModalOpen(false);
      loadFirms();
    } catch (err) {
      showError(err.message || 'Update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Multi-Tenant Enterprise Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1.5 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-400" />
            Dealership Groups &amp; Firm Control
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Manage multiple client dealership groups (Trident, Advaith, Bellad, etc.), configure firm permissions, and easily onboard new tenants in 1 click.
          </p>
        </div>

        <button
          onClick={() => setOnboardModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-lg flex items-center gap-2 transition shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          + Onboard New Dealership Client
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Active Dealership Firms"
          value={firms.length}
          subtext="Configured multi-tenant groups"
          variant="primary"
        />
        <StatCard
          label="Total Dealership Branches"
          value={firms.reduce((acc, f) => acc + Number(f.total_branches || 0), 0)}
          subtext="Showrooms & workshop centers"
          variant="default"
        />
        <StatCard
          label="Enrolled Customer Base"
          value={firms.reduce((acc, f) => acc + Number(f.total_customers || 0), 0).toLocaleString('en-IN')}
          subtext="Across all dealership tenants"
          variant="default"
        />
      </div>

      {/* Firms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading dealership firms...</p>
          </div>
        ) : firms.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No Dealership Firms Found</p>
          </div>
        ) : (
          firms.map((firm) => (
            <div
              key={firm.firm_id}
              className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 hover:border-blue-500 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm"
                      style={{ backgroundColor: firm.accent_color || firm.theme_color || '#0f172a' }}
                    >
                      {firm.firm_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{firm.firm_name}</h4>
                      <span className="font-mono text-[11px] text-slate-400 font-bold">
                        tenant: {firm.tenant_id}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Customers</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {Number(firm.total_customers || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Branches</span>
                    <span className="font-extrabold text-slate-900 text-sm">{firm.total_branches || 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Staff Users</span>
                    <span className="font-extrabold text-slate-900 text-sm">{firm.total_users || 1}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="truncate"><strong className="text-slate-900">Legal:</strong> {firm.legal_name || firm.firm_name}</div>
                  <div className="truncate"><strong className="text-slate-900">Support:</strong> {firm.contact_email || 'support@dealership.com'}</div>
                  <div><strong className="text-slate-900">Conversion Rate:</strong> 1 Pt = ₹{firm.point_to_rupee_rate || '0.25'}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedFirm(firm);
                    setEditModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Settings
                </button>
                <span className="text-[11px] text-slate-400 font-medium">Auto-Provisioned</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Onboard New Client Firm Modal ────────────────────────────────── */}
      {onboardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Onboard New Dealership Client</h3>
              </div>
              <button onClick={() => setOnboardModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tenant ID / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. trident_hyundai"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Firm Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Trident Automobiles"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Legal Registered Entity Name</label>
                <input
                  type="text"
                  placeholder="e.g. Trident Hyundai & Automobiles Pvt Ltd"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Support Email</label>
                  <input
                    type="email"
                    placeholder="loyalty@tridentauto.in"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Point to Rupee Value</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.25 (4 Pts = ₹1)"
                    value={pointRate}
                    onChange={(e) => setPointRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-blue-900">
                <span className="font-bold block">🚀 Automatic 1-Click Provisioning Includes:</span>
                <p className="text-[11px] text-blue-700">
                  • Main Showroom &amp; Service Branch<br />
                  • Dedicated Admin User (<span className="font-mono font-bold">{tenantId || 'tenant'}_admin</span> / Admin@123)<br />
                  • Standard 2W &amp; 4W In-house point rules (+100 Finance, +50 Insurance, +200 Exchange)<br />
                  • Silver, Gold, Platinum &amp; Diamond tier slabs
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning Firm...' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Firm Modal ─────────────────────────────────────────────── */}
      {editModalOpen && selectedFirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Firm: {selectedFirm.firm_name}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Firm Name</label>
                <input
                  type="text"
                  required
                  value={selectedFirm.firm_name}
                  onChange={(e) => setSelectedFirm({ ...selectedFirm, firm_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Legal Registered Name</label>
                <input
                  type="text"
                  value={selectedFirm.legal_name || ''}
                  onChange={(e) => setSelectedFirm({ ...selectedFirm, legal_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={selectedFirm.contact_email || ''}
                  onChange={(e) => setSelectedFirm({ ...selectedFirm, contact_email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManagementScreen;
