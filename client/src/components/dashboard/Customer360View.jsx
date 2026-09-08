import React, { useState } from 'react';
import { CustomerSummaryCard, DataTable, StatusBadge, Button, StatCard } from '../ui';
import { Car, History, PlusCircle, Gift, Phone, Mail, Calendar, UserCheck, Store, MapPin, Building2 } from 'lucide-react';
import EarnPointsModal from './EarnPointsModal';
import RedemptionModal from './RedemptionModal';

export const Customer360View = ({
  customer,
  ledgerData = [],
  tierInfo,
  onRefresh,
  branches = [],
}) => {
  const [earnModalOpen, setEarnModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);

  if (!customer) return null;

  const currentBalance = tierInfo?.current_balance ?? customer.current_balance ?? customer.points_balance ?? 0;
  const lifetimePoints = tierInfo?.lifetime_points ?? customer.lifetime_points ?? 0;
  const tierName = tierInfo?.tier_name || customer.tier_name || 'Silver';
  const rupeeValue = Math.floor(currentBalance / 4);

  // Columns for the Sortable Points Ledger
  const ledgerColumns = [
    {
      field: 'id',
      header: 'ID',
      sortable: true,
      align: 'left',
      cellClassName: 'font-mono text-xs text-ink-secondary',
    },
    {
      field: 'transaction_type',
      header: 'Transaction Type',
      sortable: true,
      render: (val) => {
        let label = val;
        let colorClass = 'bg-slate-100 text-slate-900 border-slate-300';
        if (val === 'sale') {
          label = 'Vehicle Sale';
          colorClass = 'bg-blue-50 text-blue-900 border-blue-300 font-bold';
        } else if (val === 'service') {
          label = 'Workshop Service';
          colorClass = 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold';
        } else if (val === 'earn_referral' || val === 'referral') {
          label = 'Referral Reward';
          colorClass = 'bg-purple-50 text-purple-900 border-purple-300 font-bold';
        } else if (val === 'redemption') {
          label = 'Redemption (Discount)';
          colorClass = 'bg-red-50 text-red-950 border-red-300 font-bold';
        }

        return (
          <span className={`inline-block px-2.5 py-1 text-sm uppercase tracking-wider rounded border ${colorClass}`}>
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
        <span
          className={`font-bold font-mono text-lg ${
            val < 0 ? 'text-action-danger' : 'text-action-success'
          }`}
        >
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
      header: 'Reference Code',
      sortable: true,
      cellClassName: 'font-mono text-sm font-semibold text-slate-800',
      render: (val) => val || '—',
    },
    {
      field: 'branch_name',
      header: 'Branch / Cashier',
      sortable: true,
      render: (val, row) => (
        <div className="text-sm font-medium">
          <div className="text-ink-primary font-semibold">{val || 'Main Showroom'}</div>
          {row.created_by_username && (
            <div className="text-xs text-ink-muted">by {row.created_by_username}</div>
          )}
        </div>
      ),
    },
    {
      field: 'created_at',
      header: 'Date & Time',
      sortable: true,
      render: (val) => (
        <span className="text-sm font-medium text-ink-secondary">
          {new Date(val).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Customer Summary Banner Card */}
      <CustomerSummaryCard
        customer={{
          ...customer,
          points_balance: currentBalance,
          tier_name: tierName,
        }}
        onRecordEarning={() => setEarnModalOpen(true)}
        onRedeemPoints={() => setRedeemModalOpen(true)}
      />

      {/* 2. Key Metrics Glanceable Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Available Point Balance"
          value={`${Number(currentBalance).toLocaleString()} PTS`}
          subtext={`≈ ₹${Number(rupeeValue).toLocaleString()} in direct discount`}
          variant="primary"
        />
        <StatCard
          label="Lifetime Points Earned"
          value={`${Number(lifetimePoints).toLocaleString()} PTS`}
          subtext="Determines permanent tier status"
          variant="default"
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

      {/* 3. Vehicles Owned Section */}
      <section className="bg-white border border-surface-border rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Car className="w-6 h-6 text-action-primary" />
            <h3 className="text-xl font-bold text-ink-primary">Registered Customer Vehicles</h3>
          </div>
          <span className="text-sm font-bold text-ink-secondary bg-slate-100 px-3 py-1 rounded border border-surface-border">
            {(customer.vehicles || []).length} Total
          </span>
        </div>

        {(customer.vehicles || []).length === 0 ? (
          <div className="p-6 bg-slate-50 border border-surface-border rounded-lg text-center text-ink-secondary text-base font-medium">
            No vehicles registered yet for this customer profile.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {customer.vehicles.map((v) => {
              const branchInfo = (() => {
                if (v.branch_name) {
                  return { name: v.branch_name, city: v.vehicle_city || v.branch_city || 'Main Branch' };
                }
                if (v.vehicle_city && branches.length > 0) {
                  const match = branches.find(
                    (b) =>
                      b.address?.toLowerCase().includes(v.vehicle_city.toLowerCase()) ||
                      b.name?.toLowerCase().includes(v.vehicle_city.toLowerCase())
                  );
                  if (match) return { name: match.name, city: match.address || v.vehicle_city };
                }
                if (ledgerData && ledgerData.length > 0) {
                  const txWithBranch = ledgerData.find((tx) => tx.branch_name);
                  if (txWithBranch) {
                    return { name: txWithBranch.branch_name, city: v.vehicle_city || 'Central Showroom' };
                  }
                }
                if (branches && branches.length > 0) {
                  return { name: branches[0].name, city: branches[0].address || 'Main Branch' };
                }
                return { name: 'Central Showroom & Service', city: 'Bangalore / Hubli' };
              })();

              return (
                <div
                  key={v.id}
                  className="bg-slate-50 border border-surface-border rounded-xl p-4 flex flex-col md:flex-row gap-4 hover:border-slate-400 transition-all shadow-xs"
                >
                  {/* Left Box: Registered Customer Vehicle Identification */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-ink-primary bg-white px-3 py-1 border border-slate-300 rounded-md shadow-xs">
                        {v.registration_number || v.chassis_no || v.vin}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 uppercase bg-slate-200/80 px-2.5 py-0.5 rounded-full">
                        {v.brand_name || 'Automobile'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Chassis / VIN Number
                      </div>
                      <div className="text-sm font-mono font-medium text-ink-secondary truncate">
                        {v.chassis_no || v.vin || v.registration_number || 'N/A'}
                      </div>
                    </div>

                    <div className="text-xs text-ink-muted pt-2 border-t border-surface-divider flex items-center justify-between">
                      <span>Customer: <strong className="font-mono text-ink-secondary">{customer.customer_id}</strong></span>
                      {v.created_at && (
                        <span>Reg: {new Date(v.created_at).toLocaleDateString('en-IN')}</span>
                      )}
                    </div>
                  </div>

                  {/* Right Box: Highlighted Box with Model Name and Branch Details beside registered vehicle */}
                  <div className="w-full md:w-64 bg-white border-2 border-blue-100 rounded-lg p-3.5 flex flex-col justify-between shadow-xs relative overflow-hidden">
                    <div className="space-y-3">
                      {/* Model Name Box */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-action-primary uppercase tracking-wider mb-1">
                          <Car className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Model Name</span>
                        </div>
                        <div className="text-base font-bold text-ink-primary tracking-tight">
                          {v.model || 'Model Unspecified'}
                        </div>
                      </div>

                      {/* Branch Details Box */}
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                          <Store className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Branch Details</span>
                        </div>
                        <div className="text-sm font-semibold text-ink-primary leading-tight">
                          {branchInfo.name}
                        </div>
                        {branchInfo.city && (
                          <div className="flex items-center gap-1 text-xs text-ink-muted pt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{branchInfo.city}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Dealership Location</span>
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-xs">
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Sortable Points Ledger Table */}
      <section className="bg-white border border-surface-border rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <History className="w-6 h-6 text-action-primary" />
            <div>
              <h3 className="text-xl font-bold text-ink-primary">Points Ledger History</h3>
              <p className="text-sm font-medium text-ink-secondary">
                Immutable audit trail of all earnings, redemptions, and referral bonuses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              icon={PlusCircle}
              onClick={() => setEarnModalOpen(true)}
            >
              + Add Points
            </Button>
            <Button
              variant="success"
              size="md"
              icon={Gift}
              onClick={() => setRedeemModalOpen(true)}
            >
              Redeem (OTP)
            </Button>
          </div>
        </div>

        <DataTable
          columns={ledgerColumns}
          data={ledgerData}
          keyField="id"
          emptyMessage="No transaction ledger history recorded for this customer yet."
        />
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

    </div>
  );
};

export default Customer360View;
