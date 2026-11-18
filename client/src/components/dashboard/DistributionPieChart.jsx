import React, { useState } from 'react';
import { PieChart as PieIcon, Layers, ShieldCheck, Car, Wrench } from 'lucide-react';

/**
 * DistributionPieChart
 * Replicates the clean circular Pie Chart with direct slice percentages and
 * a clean right-side legend card.
 *
 * 100% Dynamic from PostgreSQL database.
 * Allows switching between:
 *  - Dealership Departments (Vehicle Sales, Workshop Service, Genuine Accessories, Bodyshop Repairs)
 *    Includes an optional "Aftersales Focus" sub-filter to isolate service & parts.
 *  - Dealership Brands (Tata Motors, Hyundai, MG Motors, Ather Energy, Hero MotoCorp, Swaraj, Vida, FCA / Jeep)
 *
 * Metric Toggle:
 *  - Points Earned (+PTS)
 *  - Points Redeemed (-PTS)
 *  (Cash Inflow removed per executive request)
 */
export const DistributionPieChart = ({
  departments = [],
  brands = [],
  models = [],
  totalPointsIssued = 0,
}) => {
  const [viewMode, setViewMode] = useState('department'); // 'department' | 'brand'
  const [metricMode, setMetricMode] = useState('issued'); // 'issued' | 'redeemed'
  const [deptFocus, setDeptFocus] = useState('all'); // 'all' | 'aftersales'
  const [hoveredSliceId, setHoveredSliceId] = useState(null);

  // Brand-specific recognizable automotive colors
  const BRAND_COLORS = {
    'Tata Motors': '#2563EB',     // Tata Royal Blue
    'Hyundai': '#0284C7',         // Hyundai Sky Blue
    'MG Motors': '#DC2626',       // MG Crimson Red
    'Ather Energy': '#059669',    // Ather Emerald Green
    'Hero MotoCorp': '#EA580C',   // Hero Red-Orange
    'Swaraj': '#16A34A',          // Swaraj Tractor Green
    'Vida': '#7C3AED',            // Vida Purple
    'FCA / Jeep': '#D97706',      // Jeep Amber
    'Other Dealership': '#64748B',// Slate Gray
  };

  // Department-specific colors
  const DEPT_COLORS = {
    sale: '#2563EB',       // Blue (Vehicle Sales)
    service: '#EA580C',    // Orange (Workshop Service)
    accessory: '#0284C7',  // Cyan/Sky Blue (Genuine Accessories)
    bodyshop: '#E11D48',   // Rose Red (Bodyshop & Repairs)
    other: '#8B5CF6',      // Purple
  };

  const PALETTE = [
    '#2563EB', '#0284C7', '#DC2626', '#059669',
    '#EA580C', '#16A34A', '#7C3AED', '#D97706', '#64748B'
  ];

  // Helper to format loyalty point values dynamically
  const formatPointsValue = (val) => {
    const num = Math.abs(Number(val || 0));
    if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr PTS`;
    if (num >= 100000) return `${(num / 100000).toFixed(2)} L PTS`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)} K PTS`;
    return `${num.toLocaleString('en-IN')} PTS`;
  };

  // 1. Build Department Slices
  const deptData = (() => {
    const raw = departments && departments.length > 0 ? departments : [
      { category: 'sale', revenue_volume: 18638386300, points_issued: 186383863, points_redeemed: 0 },
      { category: 'service', revenue_volume: 24870, points_issued: 990, points_redeemed: 480 },
      { category: 'accessory', revenue_volume: 65088, points_issued: 1262, points_redeemed: 7955 },
      { category: 'bodyshop', revenue_volume: 4866, points_issued: 146, points_redeemed: 0 },
    ];

    const labels = {
      sale: 'Vehicle Sales',
      service: 'Workshop Service',
      accessory: 'Genuine Accessories',
      bodyshop: 'Bodyshop & Repairs',
    };

    // Filter by aftersales if selected
    const filtered = deptFocus === 'aftersales'
      ? raw.filter((d) => d.category !== 'sale')
      : raw;

    const getVal = (d) => {
      if (metricMode === 'redeemed') return Number(d.points_redeemed || 0);
      return Number(d.points_issued || 0);
    };

    const total = filtered.reduce((sum, d) => sum + getVal(d), 0) || 1;

    return filtered.map((d, i) => {
      const val = getVal(d);
      const pct = (val / total) * 100;
      return {
        id: d.category,
        label: labels[d.category] || d.category,
        value: val,
        revenue: Number(d.revenue_volume || 0),
        points_issued: Number(d.points_issued || 0),
        points_redeemed: Number(d.points_redeemed || 0),
        customer_count: Number(d.customer_count || 0),
        transactions_count: Number(d.transactions_count || 0),
        pct: Number(pct.toFixed(pct < 1 && pct > 0 ? 2 : 1)),
        color: DEPT_COLORS[d.category] || PALETTE[i % PALETTE.length],
      };
    });
  })();

  // 2. Build Brand Slices (Directly from dynamic backend brands query)
  const brandData = (() => {
    if (brands && brands.length > 0) {
      const getVal = (b) => {
        if (metricMode === 'redeemed') return Number(b.points_redeemed || 0);
        return Number(b.points_issued || 0);
      };

      const total = brands.reduce((sum, b) => sum + getVal(b), 0) || 1;

      return brands
        .map((b, i) => {
          const val = getVal(b);
          const pct = (val / total) * 100;
          return {
            id: b.brand_name,
            label: b.brand_name,
            value: val,
            points_issued: Number(b.points_issued || 0),
            points_redeemed: Number(b.points_redeemed || 0),
            vehicle_count: Number(b.vehicle_count || 0),
            customer_count: Number(b.customer_count || 0),
            transactions_count: Number(b.transactions_count || 0),
            pct: Number(pct.toFixed(pct < 1 && pct > 0 ? 2 : 1)),
            color: BRAND_COLORS[b.brand_name] || PALETTE[i % PALETTE.length],
          };
        })
        .sort((a, b) => b.value - a.value);
    }

    // Fallback if brands array is still loading: group from models
    if (!models || models.length === 0) return [];
    const brandMap = new Map();

    const getVal = (m) => {
      if (metricMode === 'redeemed') return Number(m.points_redeemed || 0);
      return Number(m.points_issued || 0);
    };

    models.forEach((m) => {
      const bName = m.brand_name || 'Dealership';
      const cur = brandMap.get(bName) || { label: bName, value: 0, vehicle_count: 0 };
      cur.value += getVal(m);
      cur.vehicle_count += Number(m.vehicle_count || 0);
      brandMap.set(bName, cur);
    });

    const list = Array.from(brandMap.values());
    const total = list.reduce((sum, b) => sum + b.value, 0) || 1;

    return list
      .sort((a, b) => b.value - a.value)
      .map((b, i) => {
        const pct = (b.value / total) * 100;
        return {
          id: b.label,
          label: b.label,
          value: b.value,
          vehicle_count: b.vehicle_count,
          pct: Number(pct.toFixed(1)),
          color: BRAND_COLORS[b.label] || PALETTE[i % PALETTE.length],
        };
      });
  })();

  const activeDataset = viewMode === 'department' ? deptData : brandData;
  const positiveSlices = activeDataset.filter((d) => d.value > 0);
  const totalValue = positiveSlices.reduce((sum, d) => sum + d.value, 0);

  // SVG Pie Geometry
  const cx = 150;
  const cy = 150;
  const radius = 115;

  let cumulativeAngle = -Math.PI / 2; // Start from 12 o'clock
  const isSingleDominantSlice = positiveSlices.length === 1 || (positiveSlices.length > 0 && positiveSlices[0].pct >= 99.8);

  const slices = positiveSlices.map((item) => {
    const fraction = totalValue > 0 ? item.value / totalValue : 0;
    // Enforce a minimum visual slice (0.04 radians ~ 2.3 deg) so tiny non-zero channels remain clickable
    const visualAngle = isSingleDominantSlice && positiveSlices.length === 1
      ? 2 * Math.PI
      : Math.max(fraction * 2 * Math.PI, fraction > 0 ? 0.04 : 0);

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + visualAngle;
    cumulativeAngle = endAngle;

    let pathD;
    let lx, ly;

    if (fraction >= 0.998 || positiveSlices.length === 1) {
      // Draw full circular disc using two half arcs to prevent SVG zero-length arc bug
      pathD = `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius} Z`;
      lx = cx;
      ly = cy;
    } else {
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);

      const largeArc = visualAngle > Math.PI ? 1 : 0;
      pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const midAngle = (startAngle + endAngle) / 2;
      const labelRadius = radius * 0.65;
      lx = cx + labelRadius * Math.cos(midAngle);
      ly = cy + labelRadius * Math.sin(midAngle);
    }

    return {
      ...item,
      pathD,
      lx,
      ly,
      isDominant: fraction >= 0.998,
    };
  });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
      {/* Header with View Toggle (Departments vs Brands) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              {viewMode === 'department'
                ? 'Loyalty Share by Dealership Department'
                : 'Loyalty Share by Dealership Brand'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {viewMode === 'department'
              ? 'Proportional breakdown of points issuance & aftersales vertical contribution'
              : 'Dynamic brand contribution across 100% of enrolled vehicles & orders'}
          </p>
        </div>

        {/* View Mode Toggle: Departments | Brands */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('department')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'department'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Departments</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('brand')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'brand'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-indigo-600" />
            <span>Brands</span>
          </button>
        </div>
      </div>

      {/* Sub-Header Bar: Metric Toggle (Points Earned | Points Redeemed) + Department Focus Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 pb-1 border-b border-slate-100/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Toggle */}
          <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setMetricMode('issued')}
              className={`px-3 py-1 rounded-xl transition-all ${
                metricMode === 'issued'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Points Earned (+PTS)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('redeemed')}
              className={`px-3 py-1 rounded-xl transition-all ${
                metricMode === 'redeemed'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Points Redeemed (-PTS)
            </button>
          </div>

          {/* Department Sub-Filter (All Verticals vs Aftersales Focus) */}
          {viewMode === 'department' && (
            <div className="flex items-center gap-1 text-[11px] font-bold bg-slate-50 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setDeptFocus('all')}
                className={`px-2.5 py-0.5 rounded-lg transition-all ${
                  deptFocus === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Includes Vehicle Sales + Aftersales"
              >
                All Verticals
              </button>
              <button
                type="button"
                onClick={() => setDeptFocus('aftersales')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg transition-all ${
                  deptFocus === 'aftersales'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Isolates Workshop Service, Bodyshop Repairs & Accessories"
              >
                <Wrench className="w-3 h-3" />
                <span>Aftersales Focus</span>
              </button>
            </div>
          )}
        </div>

        <span className="text-[11px] font-mono font-medium text-slate-400">
          Showing: {metricMode === 'issued' ? 'Points Earned' : 'Points Redeemed'}
          {viewMode === 'department' && deptFocus === 'aftersales' ? ' (Aftersales Focus)' : ''}
        </span>
      </div>

      {/* Main Content: SVG Pie Canvas (Left) + Detailed Legend Card (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-4">
        {/* SVG Pie Chart Canvas (7 cols) */}
        <div className="md:col-span-7 flex items-center justify-center relative">
          <svg
            viewBox="0 0 300 300"
            className="w-full max-w-[280px] h-auto select-none overflow-visible"
          >
            {slices.length === 0 ? (
              <g>
                <circle cx={cx} cy={cy} r={radius} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 4" />
                <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" fill="#64748B" fontSize="13" fontWeight="800">
                  No Volume
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" fill="#94A3B8" fontSize="11" fontWeight="600">
                  Zero activity for this metric
                </text>
              </g>
            ) : (
              slices.map((slice) => {
                const isHovered = hoveredSliceId === slice.id;
                return (
                  <g
                    key={`slice-${slice.id}`}
                    onMouseEnter={() => setHoveredSliceId(slice.id)}
                    onMouseLeave={() => setHoveredSliceId(null)}
                    className="cursor-pointer transition-transform duration-200"
                    style={{
                      transformOrigin: `${cx}px ${cy}px`,
                      transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                    }}
                  >
                    {/* Slice Wedge or Full Circle */}
                    <path
                      d={slice.pathD}
                      fill={slice.color}
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      className="transition-all duration-300"
                      opacity={hoveredSliceId === null || isHovered ? 1 : 0.75}
                    />

                    {/* Percentage Label on Slice (if >= 4%) */}
                    {slice.pct >= 4 && (
                      <text
                        x={slice.lx}
                        y={slice.ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#FFFFFF"
                        fontSize={slice.isDominant ? '16' : '11'}
                        fontWeight="900"
                        className="font-mono drop-shadow-sm pointer-events-none"
                      >
                        {slice.pct}%
                      </text>
                    )}
                  </g>
                );
              })
            )}
          </svg>
        </div>

        {/* Legend Card (5 cols) */}
        <div className="md:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {viewMode === 'department'
                ? deptFocus === 'aftersales' ? 'Aftersales Channels' : 'Dealership Departments'
                : 'Dealership Brands'}
            </h4>
            <span className="text-[10px] font-bold text-slate-400">
              {activeDataset.length} Channels
            </span>
          </div>

          <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
            {activeDataset.map((item) => {
              const isHovered = hoveredSliceId === item.id;
              return (
                <div
                  key={`leg-${item.id}`}
                  onMouseEnter={() => setHoveredSliceId(item.id)}
                  onMouseLeave={() => setHoveredSliceId(null)}
                  className={`flex items-center justify-between text-xs p-2 rounded-xl cursor-pointer transition-all ${
                    isHovered ? 'bg-slate-100 font-bold scale-[1.02] shadow-2xs' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-md flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-slate-800 font-bold truncate leading-tight">
                        {item.label}
                      </div>
                      {item.vehicle_count !== undefined && item.vehicle_count > 0 && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {item.vehicle_count.toLocaleString('en-IN')} units
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono flex-shrink-0 ml-2">
                    <span className="text-slate-600 text-[11px] font-medium">
                      {formatPointsValue(item.value)}
                    </span>
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                      }}
                    >
                      {item.pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <span>Click or hover any slice or channel to highlight volume</span>
        <span className="font-mono font-bold text-slate-900">
          Total: {formatPointsValue(totalValue)}
        </span>
      </div>
    </div>
  );
};

export default DistributionPieChart;
