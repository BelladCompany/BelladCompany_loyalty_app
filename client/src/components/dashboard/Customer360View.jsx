import React, { useState, useEffect } from 'react';
import { CustomerSummaryCard, DataTable, StatCard } from '../ui';
import {
  Car,
  History,
  PlusCircle,
  Gift,
  Phone,
  Mail,
  Calendar,
  Store,
  MapPin,
  Lock,
  Clock,
  ShieldOff,
  Users,
  FileCheck2,
  UserCheck,
  Tag,
  Receipt,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import EarnPointsModal from './EarnPointsModal';
import RedemptionModal from './RedemptionModal';
import RequestKycModal from './RequestKycModal';
import RaiseCorrectionModal from './RaiseCorrectionModal';
import ApiService from '../../services/api';

export const Customer360View = ({
  customer,
  ledgerData = [],
  tierInfo,
  onRefresh,
  branches = [],
}) => {
  const [activeProfileTab, setActiveProfileTab] = useState('ledger');
  const [earnModalOpen, setEarnModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedCorrectionRef, setSelectedCorrectionRef] = useState('');
  const [vehicleStatuses, setVehicleStatuses] = useState({});

  // Additional tab data
  const [referralHistory, setReferralHistory] = useState([]);
  const [kycHistory, setKycHistory] = useState([]);
  const [loadingTabData, setLoadingTabData] = useState(false);
  const [pendingCorrections, setPendingCorrections] = useState([]);

  // Fetch pending correction requests for customer
  useEffect(() => {
    if (!customer?.customer_id) return;
    ApiService.getCorrectionRequests('pending')
      .then((res) => {
        const list = res.data || [];
        const userPending = list.filter((r) => r.customer_id === customer.customer_id);
        setPendingCorrections(userPending);
      })
      .catch(() => setPendingCorrections([]));
  }, [customer?.customer_id, ledgerData]);

  // Fetch redemption status for every vehicle when customer profile loads
  useEffect(() => {
    const vehicles = customer?.vehicles || [];
    if (vehicles.length === 0) return;

    vehicles.forEach((v) => {
      const vid = v.id || v.vehicle_id;
      if (!vid) return;
      ApiService.getVehicleRedemptionStatus(vid)
        .then((res) => {
          setVehicleStatuses((prev) => ({ ...prev, [vid]: res.data }));
        })
        .catch(() => {});
    });
  }, [customer?.customer_id, ledgerData]);

  // Load secondary tab data when switching tabs
  useEffect(() => {
    if (!customer?.customer_id) return;

    if (activeProfileTab === 'referrals') {
      setLoadingTabData(true);
      ApiService.getReferrals()
        .then((res) => {
          const allRefs = res.data || [];
          const userRefs = allRefs.filter(
            (r) =>
              r.referrer_customer_id === customer.customer_id ||
              r.referred_customer_id === customer.customer_id
          );
          setReferralHistory(userRefs);
        })
        .catch(() => setReferralHistory([]))
        .finally(() => setLoadingTabData(false));
    } else if (activeProfileTab === 'kyc') {
      setLoadingTabData(true);
      ApiService.getPendingKycRequests()
        .then((res) => {
          const allKyc = res.data || [];
          const userKyc = allKyc.filter((k) => k.customer_id === customer.customer_id);
          setKycHistory(userKyc);
        })
        .catch(() => setKycHistory([]))
        .finally(() => setLoadingTabData(false));
    }
  }, [activeProfileTab, customer?.customer_id]);

  if (!customer) return null;

  const currentBalance = tierInfo?.current_balance ?? customer.current_balance ?? customer.points_balance ?? 0;
  const tierName = tierInfo?.tier_name || customer.tier_name || 'Silver';
  const rupeeValue = Math.floor(currentBalance / 4);

  const hasPendingCorrection =
    pendingCorrections.length > 0 ||
    Object.values(vehicleStatuses).some((v) => v?.status === 'locked_pending_correction');

  // Redemptions filtered from ledger
  const redemptionsList = ledgerData.filter(
    (item) => item.type === 'redemption' || item.transaction_type === 'redemption' || item.points < 0
  );

  // Columns for Points Ledger Table
  const ledgerColumns = [
    {
      field: 'id',
      header: 'ID',
      sortable: true,
      align: 'left',
      cellClassName: 'font-mono text-xs text-slate-500',
    },
    {
      field: 'transaction_type',
      header: 'Transaction Type',
      sortable: true,
      render: (val, row) => {
        let label = val;
        let colorClass = 'bg-slate-100 text-slate-800 border-slate-300';
        
        const refStr = (row.reference_id || row.source_ref || '').toLowerCase();
        const reasonStr = (row.reason_text || '').toLowerCase();

        if (refStr.includes('gift card') || reasonStr.includes('gift card') || row.reason_type === 'gift_card_claim') {
          label = '🎁 Gift Card Claim';
          colorClass = 'bg-purple-50 text-purple-900 border-purple-300 font-extrabold';
        } else if (refStr.includes('finance') || reasonStr.includes('finance')) {
          label = '🏦 In-house Finance';
          colorClass = 'bg-emerald-50 text-emerald-900 border-emerald-300 font-extrabold';
        } else if (refStr.includes('insurance') || reasonStr.includes('insurance')) {
          label = '🛡️ In-house Insurance';
          colorClass = 'bg-blue-50 text-blue-900 border-blue-300 font-extrabold';
        } else if (refStr.includes('exchange') || reasonStr.includes('exchange')) {
          label = '🔄 In-house Exchange';
          colorClass = 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold';
        } else if (refStr.includes('in-house') || reasonStr.includes('in-house')) {
          label = '✨ In-house Bonus';
          colorClass = 'bg-teal-50 text-teal-900 border-teal-300 font-extrabold';
        } else if (val === 'sale' || val === 'earn_sale') {
          label = '🚗 Vehicle Sale (After Disc)';
          colorClass = 'bg-sky-50 text-sky-900 border-sky-300 font-bold';
        } else if (val === 'service' || val === 'earn_service') {
          label = '🔧 Workshop Service';
          colorClass = 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold';
        } else if (val === 'earn_referral' || val === 'referral') {
          label = '👥 Referral Reward';
          colorClass = 'bg-pink-50 text-pink-900 border-pink-300 font-bold';
        } else if (val === 'redemption' || val === 'redeem') {
          label = '🏷️ Redemption (Discount)';
          colorClass = 'bg-rose-50 text-rose-950 border-rose-300 font-bold';
        } else if (val === 'expire') {
          label = 'Expired (Forfeited)';
          colorClass = 'bg-gray-200 text-gray-600 border-gray-400 font-bold';
        } else if (val === 'adjust' || val === 'manual_adjustment') {
          label = '⚖️ Points Correction';
          colorClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
        }

        return (
          <span className={`inline-block px-2.5 py-1 text-xs uppercase tracking-wider rounded border ${colorClass}`}>
            {label}
          </span>
        );
      },
    },
    {
      field: 'points',
      header: 'Points',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={`font-bold font-mono text-sm ${val < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {val > 0 ? `+${Number(val).toLocaleString()}` : Number(val).toLocaleString()}
        </span>
      ),
    },
    {
      field: 'amount_paise',
      header: 'Base Bill (₹)',
      sortable: true,
      align: 'right',
      render: (val) => (val > 0 ? `₹${(val / 100).toLocaleString()}` : '—'),
    },
    {
      field: 'reference_id',
      header: 'Reference & Details',
      sortable: true,
      render: (val) => {
        if (!val) return '—';
        const parts = val.split(' | ');
        const refCode = parts[0];
        const desc = parts.slice(1).join(' | ');
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold text-slate-800">{refCode}</span>
            {desc && <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded w-fit">{desc}</span>}
          </div>
        );
      },
    },
    {
      field: 'branch_name',
      header: 'Branch / Cashier',
      sortable: true,
      render: (val, row) => (
        <div className="text-xs font-medium">
          <div className="text-slate-900 font-semibold">{val || 'Main Showroom'}</div>
          {row.created_by_username && <div className="text-[11px] text-slate-500">by {row.created_by_username}</div>}
        </div>
      ),
    },
    {
      field: 'created_at',
      header: 'Date & Time',
      sortable: true,
      render: (val) => (
        <span className="text-xs font-medium text-slate-600">
          {new Date(val).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    {
      field: 'actions',
      header: 'Action',
      render: (_, row) => {
        if (row.type === 'expire' || row.type === 'correction_reversal' || row.type === 'correction_applied') return null;

        const refCode = String(row.receipt_no || row.reference_id || row.id || '').trim();
        const isThisRowPending = pendingCorrections.some(
          (pc) => String(pc.points_ledger_reference).trim() === refCode || String(pc.points_ledger_reference).trim() === String(row.id)
        );

        if (isThisRowPending) {
          return (
            <span className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-100 rounded border border-amber-300 shadow-2xs">
              Correction Pending
            </span>
          );
        }

        if (hasPendingCorrection) {
          return (
            <button
              type="button"
              disabled
              className="px-2 py-1 text-xs font-bold text-slate-400 bg-slate-100 rounded border border-slate-200 cursor-not-allowed"
              title="A billing correction ticket is currently pending admin approval for this customer."
            >
              Locked
            </button>
          );
        }

        return (
          <button
            type="button"
            onClick={() => {
              setSelectedCorrectionRef(row.receipt_no || row.reference_id || row.entry_id || customer.vehicles?.[0]?.registration_number || customer.customer_id);
              setCorrectionModalOpen(true);
            }}
            className="px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 shadow-xs"
          >
            Correct
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Pending Correction Alert Banner */}
      {hasPendingCorrection && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-extrabold text-amber-950 text-base">Billing Correction Ticket Pending Admin Approval</h4>
              <p className="text-xs font-semibold text-amber-800 mt-0.5">
                Correction ticket {pendingCorrections[0]?.id ? `#${pendingCorrections[0].id}` : ''} is currently under review by Admin. Points redemption and billing edits are temporarily locked for this customer.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-600 text-white font-mono font-extrabold text-xs rounded-full uppercase">
            Account Locked
          </span>
        </div>
      )}

      {/* 1. Customer Summary Card Header */}
      <CustomerSummaryCard
        customer={{
          ...customer,
          points_balance: currentBalance,
          tier_name: tierName,
        }}
        hasPendingCorrection={hasPendingCorrection}
        onRecordEarning={() => setEarnModalOpen(true)}
        onRedeemPoints={() => setRedeemModalOpen(true)}
      />

      {/* 2. Key Metrics Glanceable Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Available Point Balance"
          value={`${Number(currentBalance).toLocaleString()} PTS`}
          subtext={`≈ ₹${Number(rupeeValue).toLocaleString()} in direct discount`}
          variant="primary"
        />
        <StatCard
          label="Current Membership Tier"
          value={tierName}
          subtext={`${tierInfo?.tier_multiplier || 100}% points earning rate`}
          variant="default"
        />
        <StatCard
          label="Registered Vehicles"
          value={`${(customer.vehicles || []).length} Vehicle${(customer.vehicles || []).length === 1 ? '' : 's'}`}
          subtext="Linked across all dealership brands"
          variant="default"
        />
      </div>

      {/* 3. Detailed Customer Master Profile Card */}
      <section className="bg-white border-2 border-slate-300 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-blue-900" />
            <h3 className="text-xl font-extrabold text-slate-900">Customer Details</h3>
          </div>
          <span className="text-sm font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 uppercase">
            PR Status: {customer.pr_status || customer.billing_status || 'PR Done'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-base">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider">Customer Name</span>
            <span className="font-extrabold text-slate-900 text-lg mt-0.5 block">{customer.name || customer.customer_name || 'N/A'}</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider">Registered Phone Number</span>
            <span className="font-mono font-extrabold text-slate-900 text-lg mt-0.5 block">
              {(customer.phones || []).map((p) => p.phone_number || p).join(', ') || 'N/A'}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider">Aadhaar Card No</span>
            <span className="font-mono font-extrabold text-slate-900 text-lg mt-0.5 block">
              {customer.aadhaar_number || customer.aadhaar_no || customer.aadhaar_last4 || 'N/A'}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider">Age</span>
            <span className="font-extrabold text-slate-900 text-lg mt-0.5 block">{customer.age ? `${customer.age} Years` : 'N/A'}</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider">Firm Name</span>
            <span className="font-bold text-slate-900 text-base mt-0.5 block">{customer.firm || customer.firm_name || 'N/A'}</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider">Branch Name</span>
            <span className="font-bold text-slate-900 text-base mt-0.5 block">{customer.branch || customer.branch_name || 'Main Branch'}</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider">DMS Invoice Date</span>
            <span className="font-bold text-slate-900 text-base mt-0.5 block">{customer.dms_invoice_date || customer.dms_inv_date || 'N/A'}</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider">Customer Address</span>
            <span className="font-semibold text-slate-800 text-base mt-0.5 block">{customer.address || 'N/A'}</span>
          </div>
        </div>
      </section>

      {/* 4. Prominent Vehicle Details Block */}
      <section className="bg-white border-2 border-slate-300 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Car className="w-6 h-6 text-amber-600" />
            <h3 className="text-xl font-extrabold text-slate-900">Vehicle Specifications & Pricing</h3>
          </div>
          <span className="text-sm font-extrabold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
            {(customer.vehicles || []).length} Vehicle(s)
          </span>
        </div>

        {(customer.vehicles || []).length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-sm font-medium">
            No vehicles registered yet for this customer profile.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {customer.vehicles.map((v, idx) => {
              const vid = v.id || v.vehicle_id;
              const vs = vehicleStatuses[vid];
              const grossPrice = Number(v.gross_ex_showroom_price || (v.ex_showroom_price_paise ? v.ex_showroom_price_paise / 100 : v.ex_showroom_price) || 0);
              const dealerDisc = Number(v.dealer_cash_discount || 0);
              const empsDisc = Number(v.emps_discount || 0);
              const oemOffers = Number(v.oem_offers_amount || 0);

              const netPrice = v.net_ex_showroom_price != null 
                ? Number(v.net_ex_showroom_price)
                : Math.max(0, grossPrice - dealerDisc - empsDisc - oemOffers);

              return (
                <div
                  key={vid || idx}
                  className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 space-y-4 hover:border-amber-500 transition shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-base bg-white px-3 py-1 border border-slate-300 rounded-lg text-slate-900">
                      Reg No: {v.registration_number || v.reg_no || v.vin || v.chassis_no || 'N/A'}
                    </span>
                    <span className="text-sm font-extrabold px-3 py-1 rounded-lg bg-amber-500/10 text-amber-900 border border-amber-500/30">
                      {v.brand_name || v.brand || 'Vehicle'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-xs uppercase font-extrabold">VIN / Chassis No</span>
                      <span className="font-mono font-extrabold text-slate-900 text-base">{v.vin || v.chassis_no || 'N/A'}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-xs uppercase font-extrabold">Model Name</span>
                      <span className="font-extrabold text-slate-900 text-base">{v.model || 'Unspecified'}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-xs uppercase font-extrabold">Variant</span>
                      <span className="font-extrabold text-slate-900 text-base">{v.variant || v.varient || 'N/A'}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-xs uppercase font-extrabold">Fuel Type</span>
                      <span className="font-extrabold text-blue-900 text-base uppercase">{v.fuel_type || 'Petrol / Diesel / EV'}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-xs uppercase font-extrabold">Ex-Showroom Price (Gross)</span>
                      <span className="font-extrabold text-slate-800 text-base">{grossPrice > 0 ? `₹${grossPrice.toLocaleString('en-IN')}` : 'N/A'}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-rose-200 bg-rose-50/40">
                      <span className="text-rose-700 block text-xs uppercase font-extrabold">Offers &amp; Discounts Deducted</span>
                      <span className="font-extrabold text-rose-700 text-base">
                        {grossPrice - netPrice > 0 ? `−₹${(grossPrice - netPrice).toLocaleString('en-IN')}` : '₹0 (No Offers)'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border-2 border-emerald-400 bg-emerald-50/60 col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-emerald-900 block text-xs uppercase font-extrabold">
                            Net Ex-Showroom (After Discount)
                          </span>
                          <span className="font-black text-emerald-800 text-xl">
                            {netPrice > 0 ? `₹${netPrice.toLocaleString('en-IN')}` : 'N/A'}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                          Points Base: +{Math.floor(netPrice / 100).toLocaleString('en-IN')} PTS
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-xs uppercase font-extrabold">Firm Name</span>
                      <span className="font-bold text-slate-900 text-base">{v.firm_name || v.firm || customer.firm || 'N/A'}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-xs uppercase font-extrabold">DMS Invoice Date (Purchase)</span>
                      <span className="font-extrabold text-slate-900 text-base">{v.dms_invoice_date || customer.dms_invoice_date || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Redemption Clock Status */}
                  {vs && (
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                      <span className="text-slate-600 font-semibold">{vs.message}</span>
                      <span
                        className={`px-3 py-1 rounded-lg font-extrabold text-xs uppercase ${
                          vs.status === 'eligible'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                            : vs.status === 'locked'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {vs.status}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Tabbed Customer Profile History (Ledger / Referrals / Redemptions / KYC / Nominee) */}
      <section className="bg-white border border-surface-border rounded-xl p-5 space-y-4 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
          {[
            { id: 'ledger', label: 'Points Ledger', icon: History },
            { id: 'referrals', label: 'Referrals', icon: Users },
            { id: 'redemptions', label: 'Redemptions', icon: Receipt },
            { id: 'kyc', label: 'KYC Requests', icon: FileCheck2 },
            { id: 'nominee', label: 'Nominee Details', icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeProfileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveProfileTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-brand-navy text-brand-navy bg-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Points Ledger */}
        {activeProfileTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Transaction Audit Trail ({ledgerData.length} entries)
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRedeemModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                >
                  <Gift className="w-3.5 h-3.5" />
                  {customer?.vehicles?.[0]?.purchase_date || customer?.purchase_date ? 'Redeem (OTP)' : 'Get Points (OTP)'}
                </button>
                <button
                  onClick={() => {
                    setSelectedCorrectionRef('');
                    setCorrectionModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition"
                >
                  <FileText className="w-3.5 h-3.5" /> Raise Billing Correction
                </button>
              </div>
            </div>

            <DataTable
              columns={ledgerColumns}
              data={ledgerData}
              keyField="id"
              emptyMessage="No transaction ledger history recorded for this customer yet."
            />
          </div>
        )}

        {/* Tab 2: Referrals */}
        {activeProfileTab === 'referrals' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Referral History</h4>
            {loadingTabData ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading referral records...</div>
            ) : referralHistory.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                No referral activity logged for this customer.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Referral ID</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Suggested Points</th>
                      <th className="p-3 text-right">Credited Points</th>
                      <th className="p-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referralHistory.map((ref, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">#{ref.id || ref.referral_id}</td>
                        <td className="p-3">
                          {ref.referrer_customer_id === customer.customer_id ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded">Referrer</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">Referred Customer</span>
                          )}
                        </td>
                        <td className="p-3 uppercase font-bold text-slate-700">{ref.status}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-600">{ref.suggested_points || 0}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">{ref.points_credited || 0}</td>
                        <td className="p-3 text-slate-600">{ref.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Redemptions */}
        {activeProfileTab === 'redemptions' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Redemption Transactions</h4>
            {redemptionsList.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                No points redemption transactions recorded yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Transaction Date</th>
                      <th className="p-3 text-right">Points Redeemed</th>
                      <th className="p-3 text-right">Discount Applied</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Branch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {redemptionsList.map((red, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-700">{new Date(red.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">{Math.abs(red.points)} PTS</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          ₹{Math.floor(Math.abs(red.points) / 4)}
                        </td>
                        <td className="p-3 font-mono text-slate-800">{red.reference_id || '—'}</td>
                        <td className="p-3 text-slate-700">{red.branch_name || 'Main Showroom'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: KYC Requests */}
        {activeProfileTab === 'kyc' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">KYC Change Requests</h4>
              <button
                type="button"
                onClick={() => setKycModalOpen(true)}
                className="px-3 py-1.5 bg-action-primary text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Request Phone Update
              </button>
            </div>
            {loadingTabData ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading KYC records...</div>
            ) : kycHistory.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <div>No KYC change requests submitted for this customer.</div>
                <button
                  type="button"
                  onClick={() => setKycModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-action-primary font-bold hover:underline"
                >
                  <PlusCircle className="w-4 h-4" /> Submit first phone update request
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Request ID</th>
                      <th className="p-3">Change Type</th>
                      <th className="p-3">Old Value</th>
                      <th className="p-3">New Value</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kycHistory.map((kyc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">#{kyc.id}</td>
                        <td className="p-3 capitalize text-slate-800">{kyc.change_type}</td>
                        <td className="p-3 font-mono text-slate-600">{kyc.old_value}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{kyc.new_value}</td>
                        <td className="p-3 uppercase font-bold text-slate-700">{kyc.status}</td>
                        <td className="p-3 text-slate-600">{kyc.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Nominee Details */}
        {activeProfileTab === 'nominee' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nominee Information</h4>
            {customer.nominee ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{customer.nominee.nominee_name}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                    Active Nominee
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Relation:</span>
                    <span className="font-medium">{customer.nominee.relation || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nominee Phone:</span>
                    <span className="font-mono font-medium">{customer.nominee.nominee_phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ID Proof Type:</span>
                    <span className="font-medium">{customer.nominee.id_proof_type || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ID Proof Reference:</span>
                    <span className="font-mono font-medium">{customer.nominee.id_proof_ref || '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                No nominee on file for this customer account.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal Dialogs */}
      <EarnPointsModal
        isOpen={earnModalOpen}
        customer={customer}
        branches={branches}
        onClose={() => setEarnModalOpen(false)}
        onSuccess={() => onRefresh && onRefresh()}
      />

      <RedemptionModal
        isOpen={redeemModalOpen}
        customer={{
          ...customer,
          points_balance: currentBalance,
        }}
        branches={branches}
        onClose={() => setRedeemModalOpen(false)}
        onSuccess={() => onRefresh && onRefresh()}
      />

      <RequestKycModal
        isOpen={kycModalOpen}
        initialCustomer={customer}
        onClose={() => setKycModalOpen(false)}
        onSuccess={() => {
          // reload kyc history
          if (customer?.customer_id) {
            setLoadingTabData(true);
            ApiService.getPendingKycRequests()
              .then((res) => {
                const allKyc = res.data || [];
                const userKyc = allKyc.filter((k) => k.customer_id === customer.customer_id);
                setKycHistory(userKyc);
              })
              .catch(() => {})
              .finally(() => setLoadingTabData(false));
          }
        }}
      />

      <RaiseCorrectionModal
        isOpen={correctionModalOpen}
        initialCustomerId={customer?.customer_id}
        initialReference={selectedCorrectionRef}
        onClose={() => setCorrectionModalOpen(false)}
        onSuccess={() => onRefresh && onRefresh()}
      />
    </div>
  );
};

export default Customer360View;
