import React, { useState } from 'react';
import { Building2, Users, IndianRupee, Coins, Tag, TrendingUp, Compass, Target, Info } from 'lucide-react';

/**
 * BranchNetworkChart
 * Executive Non-Bar Chart visualization for Dealership Branches:
 * 1. Quadrant Bubble Matrix (Customer Footfall vs Cash Invoiced vs Points Earned vs Burn Rate)
 * 2. Radial Speedometer Dial Hub (Automotive gauge cluster per branch)
 */
export const BranchNetworkChart = ({ branches = [], currentFilter = 'All Time' }) => {
  const [chartMode, setChartMode] = useState('bubble'); // 'bubble' | 'gauge'
  const [hoveredBranch, setHoveredBranch] = useState(null);
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
      bg: 'rgba(59, 130, 246, 0.18)',
      border: '#3B82F6',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'Steady Redemptions',
      dotColor: '#3B82F6',
    };
    if (burnRatePct >= 10) {
      colorTheme = {
        bg: 'rgba(16, 185, 129, 0.22)',
        border: '#10B981',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'High Retention',
        dotColor: '#10B981',
      };
    } else if (burnRatePct < 3) {
      colorTheme = {
        bg: 'rgba(245, 158, 11, 0.20)',
        border: '#F59E0B',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'High Issuance / Reserve',
        dotColor: '#F59E0B',
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

  // Calculate Maximums for Scaling
  const maxCust = Math.max(...items.map((i) => i.cust), 10);
  const maxRev = Math.max(...items.map((i) => i.rev), 100000);
  const maxPts = Math.max(...items.map((i) => i.issued), 1000);

  // SVG Dimensions for Bubble Chart
  const svgWidth = 720;
  const svgHeight = 360;
  const padding = { top: 40, right: 60, bottom: 50, left: 75 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  // Grid tick counts
  const xTicks = 4;
  const yTicks = 4;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-5">
      {/* ── 1. Header with View Toggle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Branch Network Performance &amp; Footfall Intelligence</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quadrant Footfall Matrix: Customer visits vs. cash invoiced vs. points earned &amp; redeemed
          </p>
        </div>

        {/* View Switcher: Quadrant Bubble Matrix vs Radial Speedometer Gauges */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartMode('bubble')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              chartMode === 'bubble'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Quadrant Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('gauge')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              chartMode === 'gauge'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Radial Gauges</span>
          </button>
        </div>
      </div>

      {/* ── 2A. MODE A: Quadrant Bubble Matrix (Scatter Plot) ── */}
      {chartMode === 'bubble' && (
        <div className="space-y-3">
          {/* Axis Labels Header */}
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-2">
            <span className="flex items-center gap-1">
              <IndianRupee className="w-3 h-3 text-slate-400" />
              Vertical: Invoiced Revenue (₹ Volume)
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              Horizontal: Customer Footfall (Unique Customers)
            </span>
          </div>

          <div className="relative w-full py-1">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none"
            >
              {/* Quadrant Background Panels */}
              {/* Top-Right Quadrant: Star Performers */}
              <rect
                x={padding.left + chartW / 2}
                y={padding.top}
                width={chartW / 2}
                height={chartH / 2}
                fill="#F8FAFC"
                opacity="0.8"
              />
              <text
                x={padding.left + chartW - 12}
                y={padding.top + 18}
                textAnchor="end"
                fontSize="9"
                fontWeight="800"
                fill="#94A3B8"
                className="uppercase tracking-wider font-mono"
              >
                ★ Top Performers (High Footfall &amp; High Revenue)
              </text>

              {/* Top-Left Quadrant: Premium Centers */}
              <rect
                x={padding.left}
                y={padding.top}
                width={chartW / 2}
                height={chartH / 2}
                fill="#FAFAFA"
                opacity="0.5"
              />
              <text
                x={padding.left + 12}
                y={padding.top + 18}
                textAnchor="start"
                fontSize="9"
                fontWeight="800"
                fill="#94A3B8"
                className="uppercase tracking-wider font-mono"
              >
                ◆ Premium Revenue Centers
              </text>

              {/* Bottom-Right Quadrant: High Footfall Centers */}
              <rect
                x={padding.left + chartW / 2}
                y={padding.top + chartH / 2}
                width={chartW / 2}
                height={chartH / 2}
                fill="#FAFAFA"
                opacity="0.5"
              />
              <text
                x={padding.left + chartW - 12}
                y={padding.top + chartH - 10}
                textAnchor="end"
                fontSize="9"
                fontWeight="800"
                fill="#94A3B8"
                className="uppercase tracking-wider font-mono"
              >
                👥 High Footfall Hubs (Workshop Volume)
              </text>

              {/* Horizontal Gridlines & Y-Axis Labels (Revenue) */}
              {Array.from({ length: yTicks + 1 }, (_, i) => {
                const tickRev = (maxRev / yTicks) * (yTicks - i);
                const y = padding.top + (chartH / yTicks) * i;
                return (
                  <g key={`y-${i}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + chartW}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeWidth="1"
                      strokeDasharray={i === yTicks / 2 ? '4 3' : '2 2'}
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fontWeight="600"
                      fill="#64748B"
                      className="font-mono"
                    >
                      {formatInr(tickRev)}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Gridlines & X-Axis Labels (Customer Footfall) */}
              {Array.from({ length: xTicks + 1 }, (_, i) => {
                const tickCust = Math.round((maxCust / xTicks) * i);
                const x = padding.left + (chartW / xTicks) * i;
                return (
                  <g key={`x-${i}`}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + chartH}
                      stroke="#E2E8F0"
                      strokeWidth="1"
                      strokeDasharray={i === xTicks / 2 ? '4 3' : '2 2'}
                    />
                    <text
                      x={x}
                      y={padding.top + chartH + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="#64748B"
                      className="font-mono"
                    >
                      {tickCust.toLocaleString('en-IN')}
                    </text>
                  </g>
                );
              })}

              {/* Midpoint Axis Dividers (Center of Quadrants) */}
              <line
                x1={padding.left + chartW / 2}
                y1={padding.top}
                x2={padding.left + chartW / 2}
                y2={padding.top + chartH}
                stroke="#CBD5E1"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <line
                x1={padding.left}
                y1={padding.top + chartH / 2}
                x2={padding.left + chartW}
                y2={padding.top + chartH / 2}
                stroke="#CBD5E1"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {/* Branch Bubbles */}
              {items.map((b, idx) => {
                // Compute (x, y) coordinates
                const xNorm = maxCust > 0 ? b.cust / maxCust : 0.5;
                const yNorm = maxRev > 0 ? b.rev / maxRev : 0.5;

                const cx = padding.left + Math.max(Math.min(xNorm * chartW, chartW - 30), 30);
                const cy = padding.top + chartH - Math.max(Math.min(yNorm * chartH, chartH - 30), 30);

                // Bubble radius based on Points Issued (minimum 18, maximum 42)
                const ptsNorm = maxPts > 0 ? b.issued / maxPts : 0.5;
                const r = 18 + ptsNorm * 24;

                const isHovered = hoveredBranch?.id === b.id;
                const isSelected = selectedBranchId === b.id;

                return (
                  <g
                    key={b.id || idx}
                    onMouseEnter={() => setHoveredBranch(b)}
                    onMouseLeave={() => setHoveredBranch(null)}
                    onClick={() => setSelectedBranchId(selectedBranchId === b.id ? null : b.id)}
                    className="cursor-pointer transition-all duration-300"
                  >
                    {/* Pulsing Outer Aura when Hovered */}
                    {isHovered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 10}
                        fill={b.theme.border}
                        opacity="0.18"
                        className="animate-pulse"
                      />
                    )}

                    {/* Main Bubble Body */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? r + 3 : r}
                      fill={b.theme.bg}
                      stroke={b.theme.border}
                      strokeWidth={isHovered ? '3.5' : isSelected ? '3' : '2'}
                      className="transition-all duration-200"
                    />

                    {/* Inner Center Dot */}
                    <circle
                      cx={cx}
                      cy={cy - 6}
                      r="4"
                      fill={b.theme.dotColor}
                    />

                    {/* Branch Label Inside Bubble */}
                    <text
                      x={cx}
                      y={cy + 8}
                      textAnchor="middle"
                      fontSize={r > 28 ? '10' : '9'}
                      fontWeight="800"
                      fill="#0F172A"
                      className="font-sans pointer-events-none"
                    >
                      {b.name.split(' ')[0]}
                    </text>

                    {/* Sub-label: Burn Rate % */}
                    <text
                      x={cx}
                      y={cy + 19}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="700"
                      fill={b.theme.dotColor}
                      className="font-mono pointer-events-none"
                    >
                      {b.burnRatePct}% Burn
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredBranch && (
              <div
                className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl text-xs border border-slate-700 font-sans max-w-xs animate-fadeIn"
                style={{
                  left: '50%',
                  top: '12%',
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-2 mb-2.5">
                  <div>
                    <h4 className="font-black text-sm text-white">{hoveredBranch.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      City: {hoveredBranch.city} &bull; Branch #{hoveredBranch.id}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hoveredBranch.theme.badge}`}>
                    {hoveredBranch.theme.label}
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-indigo-400" />
                      Customer Footfall:
                    </span>
                    <span className="font-bold text-white">
                      {hoveredBranch.cust.toLocaleString('en-IN')} Cust ({hoveredBranch.txns} Visits)
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <IndianRupee className="w-3 h-3 text-slate-300" />
                      Invoiced Revenue:
                    </span>
                    <span className="font-bold text-white">
                      {formatInr(hoveredBranch.rev)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <Coins className="w-3 h-3 text-emerald-400" />
                      Points Earned:
                    </span>
                    <span className="font-bold text-emerald-300">
                      +{hoveredBranch.issued.toLocaleString('en-IN')} PTS
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-rose-400" />
                      Points Redeemed:
                    </span>
                    <span className="font-bold text-rose-300">
                      -{hoveredBranch.redeemed.toLocaleString('en-IN')} PTS
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                    <span className="text-amber-400">Counter Discounts:</span>
                    <span className="font-bold text-amber-300">
                      {formatInr(hoveredBranch.discountInr)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-indigo-300">Burn Rate:</span>
                    <span className="font-bold text-indigo-200">
                      {hoveredBranch.burnRatePct}% (Redeemed/Issued)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bubble Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 inline-block" />
              <span>Burn Rate &gt; 10% (Active Redemptions)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600 inline-block" />
              <span>Burn Rate 3% - 10% (Healthy)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600 inline-block" />
              <span>Burn Rate &lt; 3% (High Issuance / Reserve)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Bubble Size = Points Issued Volume</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 2B. MODE B: Radial Speedometer Dial Cluster ── */}
      {chartMode === 'gauge' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
          {items.map((b) => {
            // Radial Gauge calculations
            const gaugeSize = 130;
            const strokeW = 10;
            const radius = (gaugeSize - strokeW) / 2;
            const center = gaugeSize / 2;
            const circumference = 2 * Math.PI * radius;

            // Metric proportions
            const footfallPct = maxCust > 0 ? Math.min((b.cust / maxCust), 1) : 0.5;
            const burnPct = Math.min(b.burnRatePct / 30, 1); // 30% is full arc

            const strokeDashoffset = circumference - footfallPct * circumference;

            return (
              <div
                key={b.id}
                className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/90 transition-all hover:shadow-md flex flex-col justify-between items-center text-center space-y-3 group"
              >
                <div>
                  <h4 className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition truncate">
                    {b.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {b.city} &bull; Branch #{b.id}
                  </span>
                </div>

                {/* Circular Speedometer Arc */}
                <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                  <svg width={gaugeSize} height={gaugeSize} className="rotate-[-90deg]">
                    {/* Background Ring */}
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke="#E2E8F0"
                      strokeWidth={strokeW}
                    />
                    {/* Progress Arc */}
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke={b.theme.border}
                      strokeWidth={strokeW}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>

                  {/* Inside Dial Center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-black font-mono text-slate-900 leading-tight">
                      {b.burnRatePct}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Burn Rate
                    </span>
                  </div>
                </div>

                {/* Branch Key Numbers Strip */}
                <div className="w-full space-y-1.5 pt-1 text-xs border-t border-slate-200/60 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-sans">👥 Footfall:</span>
                    <span className="font-bold text-slate-900">{b.cust.toLocaleString('en-IN')} Cust</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-sans">🪙 Earned:</span>
                    <span className="font-bold text-emerald-700">+{formatPts(b.issued)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-sans">🏷️ Redeemed:</span>
                    <span className="font-bold text-rose-600">
                      {b.redeemed > 0 ? `-${formatPts(b.redeemed)}` : '0 PTS'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/40">
                    <span className="text-slate-500 font-sans">💵 Invoiced:</span>
                    <span className="font-bold text-slate-900">{formatInr(b.rev)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-sans">🏷️ Discounts:</span>
                    <span className="font-bold text-amber-700">{formatInr(b.discountInr)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. Branch Quick Comparison Cards Strip (Horizontal Quick-View) ── */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
            Dealership Branch Performance Roster ({items.length} Branches)
          </span>
          <span className="text-[11px] text-slate-400">
            Click any branch to highlight on the matrix
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((b) => {
            const isSelected = selectedBranchId === b.id || hoveredBranch?.id === b.id;
            return (
              <div
                key={`roster-${b.id}`}
                onClick={() => setSelectedBranchId(selectedBranchId === b.id ? null : b.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-400 shadow-sm ring-2 ring-indigo-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-xs text-slate-900 truncate">{b.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${b.theme.badge}`}>
                    {b.burnRatePct}% Burn
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Footfall:</span>
                    <span className="font-bold text-slate-800">{b.cust} Cust</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Discounts:</span>
                    <span className="font-bold text-amber-700">{formatInr(b.discountInr)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Earned:</span>
                    <span className="font-bold text-emerald-700">+{formatPts(b.issued)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Inflow:</span>
                    <span className="font-bold text-slate-900">{formatInr(b.rev)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BranchNetworkChart;
