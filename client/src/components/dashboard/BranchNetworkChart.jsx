import React, { useState } from 'react';
import { Building2, Users, IndianRupee, Coins, Tag, TrendingUp, Target, Award } from 'lucide-react';

/**
 * BranchNetworkChart
 * Dedicated Radial Speedometer Gauges Visualization for Dealership Branches
 * Shows:
 *  - Branch Name & City
 *  - Customer Footfall & Visits
 *  - Points Earned (+PTS) & Redeemed (-PTS)
 *  - Invoiced Revenue (₹) & Discounts Delivered (₹)
 *  - Burn Rate % Radial Speedometer Arc
 */
export const BranchNetworkChart = ({ branches = [], currentFilter = 'All Time' }) => {
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  // Fallback branches if empty
  const rawBranches = Array.isArray(branches) && branches.length > 0 ? branches : [
    { branch_id: 1, branch_name: 'Central Hubballi', branch_city: 'Hubballi', customer_count: 2150, transactions_count: 2480, points_issued: 14200000, points_redeemed: 185000, total_revenue: 148000000 },
    { branch_id: 2, branch_name: 'Belagavi Main', branch_city: 'Belagavi', customer_count: 980, transactions_count: 1120, points_issued: 5800000, points_redeemed: 82000, total_revenue: 62000000 },
    { branch_id: 3, branch_name: 'Gokul Road Ather', branch_city: 'Hubballi', customer_count: 420, transactions_count: 490, points_issued: 2800000, points_redeemed: 41000, total_revenue: 28000000 },
    { branch_id: 4, branch_name: 'Dharwad Vidyagiri', branch_city: 'Dharwad', customer_count: 260, transactions_count: 310, points_issued: 1400000, points_redeemed: 19000, total_revenue: 16000000 },
  ];

  // Helper to format currency
  const formatInr = (val) => {
    const num = Number(val || 0);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)} K`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // Helper to format points
  const formatPts = (val) => {
    const num = Number(val || 0);
    if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(1)} L`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)} K`;
    return num.toLocaleString('en-IN');
  };

  // Normalize branch items
  const items = rawBranches.map((b) => {
    const issued = Number(b.points_issued || 0);
    const redeemed = Number(b.points_redeemed || 0);
    const cust = Number(b.customer_count || 0);
    const txns = Number(b.transactions_count || 0);
    const rev = Number(b.total_revenue || 0);
    const burnRatePct = issued > 0 ? Number(((redeemed / issued) * 100).toFixed(1)) : 0;
    const discountInr = Number(b.cash_redeemed_inr || Math.round(redeemed * 0.25));

    // Color theme based on retention health (Burn Rate)
    let colorTheme = {
      bg: 'rgba(59, 130, 246, 0.12)',
      border: '#3B82F6',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'Steady Redemptions',
      strokeColor: '#2563EB',
    };
    if (burnRatePct >= 10) {
      colorTheme = {
        bg: 'rgba(16, 185, 129, 0.14)',
        border: '#10B981',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'High Retention',
        strokeColor: '#059669',
      };
    } else if (burnRatePct < 3) {
      colorTheme = {
        bg: 'rgba(245, 158, 11, 0.14)',
        border: '#F59E0B',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'High Issuance Reserve',
        strokeColor: '#D97706',
      };
    }

    return {
      id: b.branch_id || b.branch_name,
      name: b.branch_name || 'Dealership Branch',
      city: b.branch_city || 'Central',
      cust,
      txns,
      issued,
      redeemed,
      rev,
      burnRatePct,
      discountInr,
      theme: colorTheme,
    };
  });

  const maxCust = Math.max(...items.map((i) => i.cust), 10);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-5">
      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Branch Network Performance &amp; Customer Footfall</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Radial Speedometer Gauges: Customer footfall, points earned vs. redeemed &amp; counter cash flow
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 font-mono self-start sm:self-auto">
          <Target className="w-3.5 h-3.5 text-indigo-500" />
          <span>{items.length} Dealership Branches</span>
        </div>
      </div>

      {/* ── 2. Radial Speedometer Gauge Cluster ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-1">
        {items.map((b) => {
          // Speedometer Arc Dimensions
          const gaugeSize = 140;
          const strokeW = 10;
          const radius = (gaugeSize - strokeW) / 2;
          const center = gaugeSize / 2;
          const circumference = 2 * Math.PI * radius;

          // Arc length: 75% semi-circle gauge (270 degrees)
          const gaugeArc = 0.75;
          const totalArcLength = circumference * gaugeArc;

          // Footfall progress proportion
          const footfallRatio = maxCust > 0 ? Math.min(b.cust / maxCust, 1) : 0.5;
          const progressDashoffset = totalArcLength * (1 - footfallRatio);

          const isSelected = selectedBranchId === b.id;

          return (
            <div
              key={b.id}
              onClick={() => setSelectedBranchId(selectedBranchId === b.id ? null : b.id)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between items-center text-center space-y-3.5 group ${
                isSelected
                  ? 'bg-indigo-50/70 border-indigo-500 shadow-md ring-2 ring-indigo-300/40'
                  : 'bg-slate-50/70 hover:bg-white hover:border-indigo-300 hover:shadow-md border-slate-200/90'
              }`}
            >
              {/* Branch Header */}
              <div className="w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.theme.badge}`}>
                    {b.city}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    ID #{b.id}
                  </span>
                </div>
                <h4 className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition truncate mt-1 text-left">
                  {b.name}
                </h4>
              </div>

              {/* Radial Speedometer Gauge (SVG) */}
              <div className="relative w-[140px] h-[120px] flex items-center justify-center -mb-2">
                <svg width={gaugeSize} height={gaugeSize} className="rotate-[135deg]">
                  {/* Gauge Background Track (270 degree arc) */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="#E2E8F0"
                    strokeWidth={strokeW}
                    strokeDasharray={`${totalArcLength} ${circumference}`}
                    strokeLinecap="round"
                  />
                  {/* Active Gauge Progress Arc */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={b.theme.strokeColor}
                    strokeWidth={strokeW}
                    strokeDasharray={`${totalArcLength} ${circumference}`}
                    strokeDashoffset={progressDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Dial Center Info */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 pointer-events-none">
                  <span className="text-xl font-black font-mono text-slate-900 tracking-tight leading-none">
                    {b.burnRatePct}%
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    Burn Rate
                  </span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 mt-0.5">
                    {b.cust.toLocaleString('en-IN')} Cust
                  </span>
                </div>
              </div>

              {/* Branch Metrics Breakdown */}
              <div className="w-full space-y-1.5 pt-2 text-xs border-t border-slate-200/60 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-500" />
                    Footfall:
                  </span>
                  <span className="font-bold text-slate-900">
                    {b.cust.toLocaleString('en-IN')} Cust ({b.txns} Visits)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans flex items-center gap-1">
                    <Coins className="w-3 h-3 text-emerald-500" />
                    Earned:
                  </span>
                  <span className="font-bold text-emerald-700">
                    +{formatPts(b.issued)} PTS
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans flex items-center gap-1">
                    <Tag className="w-3 h-3 text-rose-500" />
                    Redeemed:
                  </span>
                  <span className="font-bold text-rose-600">
                    {b.redeemed > 0 ? `-${formatPts(b.redeemed)} PTS` : '0 PTS'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/40">
                  <span className="text-slate-500 font-sans flex items-center gap-1">
                    <IndianRupee className="w-3 h-3 text-slate-400" />
                    Invoiced:
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatInr(b.rev)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-500" />
                    Discounts:
                  </span>
                  <span className="font-bold text-amber-700">
                    {formatInr(b.discountInr)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. Footer Legend Strip ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-slate-700">Burn Rate &gt; 10% (Active Redemptions)</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span className="text-slate-700">Burn Rate 3% - 10% (Healthy)</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-slate-700">Burn Rate &lt; 3% (Reserve)</span>
          </div>
        </div>

        <span className="font-mono text-[11px] text-slate-400">
          Dial Arc = Customer Footfall Volume | Center = Burn Rate %
        </span>
      </div>
    </div>
  );
};

export default BranchNetworkChart;
