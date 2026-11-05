import React, { useState } from 'react';
import { BarChart3, Info, TrendingUp, Calendar } from 'lucide-react';

/**
 * ComboVelocityChart
 * Replicates the executive dual-axis clustered column + dual overlaid trend lines chart
 * (Screenshot 1).
 *
 * - Blue Bars: Points Issued (Accrued)
 * - Orange Bars: Points Redeemed (Burned)
 * - Green Line with Dots: Points Burn Rate %
 * - Yellow Line with Dots: Redemption Activity Rate %
 * - Left Y-Axis: Scaled Points (in Lakhs / Millions or PTS)
 * - Right Y-Axis: Percentage (0% to 10%+)
 * - Bottom X-Axis: Time periods (Months / Quarters)
 * - Interactive hover tooltip with exact figures
 * - Clean bottom legend matching executive spec
 */
export const ComboVelocityChart = ({ trendData = [], totalTransactions = 1, currentFilter = 'All Time' }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Normalize / prepare series data
  const rawItems = Array.isArray(trendData) && trendData.length > 0 ? trendData : [
    { month_label: 'Sep 2026', points_issued: 19873078, points_redeemed: 37634, transactions_count: 3260 },
    { month_label: 'Oct 2026', points_issued: 426191, points_redeemed: 135160, transactions_count: 161 },
    { month_label: 'Nov 2026', points_issued: 542120, points_redeemed: 101574, transactions_count: 78 },
  ];

  // If there are only 3 months, pad with previous baseline months or display cleanly
  const items = rawItems.map((d) => {
    const issued = Number(d.points_issued || 0);
    const redeemed = Number(d.points_redeemed || 0);
    const txns = Number(d.transactions_count || 0);
    const burnRatePct = issued > 0 ? (redeemed / issued) * 100 : 0;
    const activityRatePct = totalTransactions > 0 ? (txns / totalTransactions) * 100 : (txns > 0 ? 5.5 : 0);

    return {
      label: d.month_label || d.label || 'Period',
      issued,
      redeemed,
      txns,
      burnRatePct: Number(burnRatePct.toFixed(2)),
      activityRatePct: Number(Math.min(activityRatePct, 20).toFixed(2)),
    };
  });

  // Dimensions
  const svgWidth = 660;
  const svgHeight = 320;
  const padding = { top: 35, right: 55, bottom: 50, left: 70 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Max points for Left Y-Axis
  const maxPointsRaw = Math.max(...items.map((d) => Math.max(d.issued, d.redeemed)), 100000);
  // Round up to clean ceiling (e.g. 2 Cr or nearest 50L)
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxPointsRaw)));
  const maxPoints = Math.ceil(maxPointsRaw / magnitude) * magnitude;

  // Max % for Right Y-Axis
  const maxPctRaw = Math.max(...items.map((d) => Math.max(d.burnRatePct, d.activityRatePct)), 8);
  const maxPct = Math.max(10, Math.ceil(maxPctRaw / 2) * 2); // e.g. 10%, 12%, 14%

  // 5 grid ticks
  const numTicks = 5;
  const leftTicks = Array.from({ length: numTicks + 1 }, (_, i) => (maxPoints / numTicks) * i);
  const rightTicks = Array.from({ length: numTicks + 1 }, (_, i) => (maxPct / numTicks) * i);

  // Helper to format points for Left Y-Axis
  const formatYAxisPoints = (val) => {
    if (val === 0) return '0';
    if (val >= 10000000) return `${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(0)} L`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)} K`;
    return String(Math.round(val));
  };

  // Slot calculations
  const slotWidth = chartWidth / items.length;
  const barWidth = Math.min(Math.max(slotWidth * 0.26, 16), 34);
  const barGap = 4;

  // Line paths coordinates
  const greenPoints = items.map((d, i) => {
    const x = padding.left + i * slotWidth + slotWidth / 2;
    const yPct = d.burnRatePct / maxPct;
    const y = padding.top + chartHeight - yPct * chartHeight;
    return { x, y, val: d.burnRatePct };
  });

  const yellowPoints = items.map((d, i) => {
    const x = padding.left + i * slotWidth + slotWidth / 2;
    const yPct = d.activityRatePct / maxPct;
    const y = padding.top + chartHeight - yPct * chartHeight;
    return { x, y, val: d.activityRatePct };
  });

  const greenLineD = greenPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const yellowLineD = yellowPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Points Velocity &amp; Burn Trend
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Clustered monthly points issuance vs. redemptions with dual-axis burn rate %
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentFilter}</span>
        </div>
      </div>

      {/* Axis Unit Sub-headers */}
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-2 pt-2">
        <span>PTS Volume (L / Cr)</span>
        <span>Burn &amp; Velocity Rate (%)</span>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-x-auto py-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[580px] select-none"
        >
          {/* Horizontal Gridlines */}
          {leftTicks.map((tick, i) => {
            const y = padding.top + chartHeight - (tick / maxPoints) * chartHeight;
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1.2"
                />
                {/* Left Y-axis label */}
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight="600"
                  fill="#94A3B8"
                  className="font-mono"
                >
                  {formatYAxisPoints(tick)}
                </text>
                {/* Right Y-axis label */}
                <text
                  x={padding.left + chartWidth + 10}
                  y={y + 4}
                  textAnchor="start"
                  fontSize="10"
                  fontWeight="600"
                  fill="#94A3B8"
                  className="font-mono"
                >
                  {rightTicks[i].toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Bottom baseline */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />

          {/* Clustered Bars for Each Slot */}
          {items.map((d, i) => {
            const slotX = padding.left + i * slotWidth;
            const clusterWidth = barWidth * 2 + barGap;
            const startX = slotX + (slotWidth - clusterWidth) / 2;

            // Bar heights
            const issuedH = (d.issued / maxPoints) * chartHeight;
            const redeemedH = (d.redeemed / maxPoints) * chartHeight;

            const isHovered = hoveredIndex === i;

            return (
              <g
                key={`slot-${i}`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Hover Column Background */}
                {isHovered && (
                  <rect
                    x={slotX + 4}
                    y={padding.top}
                    width={slotWidth - 8}
                    height={chartHeight}
                    fill="#F8FAFC"
                    rx="6"
                  />
                )}

                {/* Blue Bar: Points Issued */}
                <rect
                  x={startX}
                  y={padding.top + chartHeight - issuedH}
                  width={barWidth}
                  height={Math.max(issuedH, 3)}
                  fill="#2563EB"
                  rx="3"
                  className="transition-all duration-300"
                  opacity={isHovered ? 1 : 0.9}
                />

                {/* Orange Bar: Points Redeemed */}
                <rect
                  x={startX + barWidth + barGap}
                  y={padding.top + chartHeight - redeemedH}
                  width={barWidth}
                  height={Math.max(redeemedH, 3)}
                  fill="#EA580C"
                  rx="3"
                  className="transition-all duration-300"
                  opacity={isHovered ? 1 : 0.9}
                />

                {/* X-axis Month Label */}
                <text
                  x={slotX + slotWidth / 2}
                  y={padding.top + chartHeight + 22}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? '800' : '600'}
                  fill={isHovered ? '#0F172A' : '#64748B'}
                >
                  {d.label}
                </text>
              </g>
            );
          })}

          {/* Green Line (Burn Rate %) */}
          <path
            d={greenLineD}
            fill="none"
            stroke="#16A34A"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {greenPoints.map((p, i) => (
            <circle
              key={`gp-${i}`}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#16A34A"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-transform hover:scale-125"
            />
          ))}

          {/* Yellow / Amber Line (Activity Velocity %) */}
          <path
            d={yellowLineD}
            fill="none"
            stroke="#CA8A04"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {yellowPoints.map((p, i) => (
            <circle
              key={`yp-${i}`}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#EAB308"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-transform hover:scale-125"
            />
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && items[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-xl text-xs border border-slate-700 font-sans animate-fadeIn"
            style={{
              left: `${Math.min(
                Math.max(((padding.left + hoveredIndex * slotWidth + slotWidth / 2) / svgWidth) * 100, 15),
                85
              )}%`,
              top: '15%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-black text-slate-200 border-b border-slate-700/80 pb-1 mb-1.5 flex items-center justify-between gap-4">
              <span>{items[hoveredIndex].label}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {items[hoveredIndex].txns.toLocaleString('en-IN')} Txns
              </span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2 h-2 rounded-xs bg-blue-500 inline-block" />
                  Points Issued:
                </span>
                <span className="font-bold text-white">
                  +{items[hoveredIndex].issued.toLocaleString('en-IN')} PTS
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-orange-400">
                  <span className="w-2 h-2 rounded-xs bg-orange-500 inline-block" />
                  Points Redeemed:
                </span>
                <span className="font-bold text-white">
                  -{items[hoveredIndex].redeemed.toLocaleString('en-IN')} PTS
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Burn Rate:
                </span>
                <span className="font-bold text-emerald-300">
                  {items[hoveredIndex].burnRatePct}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Velocity Share:
                </span>
                <span className="font-bold text-amber-300">
                  {items[hoveredIndex].activityRatePct}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Legend (Pixel-matched to Screenshot 1) */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-3 border-t border-slate-100 text-xs font-bold text-slate-700">
        {/* Blue Bar */}
        <div className="flex items-center gap-2">
          <span className="w-4 h-2.5 bg-blue-600 rounded-xs inline-block" />
          <span>Points Issued</span>
        </div>
        {/* Orange Bar */}
        <div className="flex items-center gap-2">
          <span className="w-4 h-2.5 bg-orange-600 rounded-xs inline-block" />
          <span>Points Redeemed</span>
        </div>
        {/* Green Line */}
        <div className="flex items-center gap-2">
          <span className="flex items-center">
            <span className="w-3 h-0.5 bg-emerald-600" />
            <span className="w-2 h-2 rounded-full bg-emerald-600 -mx-1" />
            <span className="w-3 h-0.5 bg-emerald-600" />
          </span>
          <span>Burn Rate %</span>
        </div>
        {/* Yellow Line */}
        <div className="flex items-center gap-2">
          <span className="flex items-center">
            <span className="w-3 h-0.5 bg-amber-500" />
            <span className="w-2 h-2 rounded-full bg-amber-500 -mx-1" />
            <span className="w-3 h-0.5 bg-amber-500" />
          </span>
          <span>Activity Velocity %</span>
        </div>
      </div>
    </div>
  );
};

export default ComboVelocityChart;

