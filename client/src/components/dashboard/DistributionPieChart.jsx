import React, { useState } from 'react';
import { PieChart as PieIcon, Layers, ShieldCheck } from 'lucide-react';

/**
 * DistributionPieChart
 * Replicates the clean circular Pie Chart with direct slice percentages and
 * a clean right-side legend card (matching Screenshot 2).
 *
 * Allows switching between:
 *  - Core Departments (Sales, Service, Bodyshop, Accessories)
 *  - Dealership Brands (Tata Motors, Ather Energy, Hero Moto Corp, Hyundai, MG Motors, etc.)
 */
export const DistributionPieChart = ({ departments = [], models = [], totalPointsIssued = 0 }) => {
  const [viewMode, setViewMode] = useState('department'); // 'department' | 'brand'
  const [metricMode, setMetricMode] = useState('issued'); // 'issued' | 'redeemed' | 'revenue'
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // Vibrant palette pixel-matched to Screenshot 2
  const COLORS = [
    '#3B82F6', // Blue (Marketing/Sales)
    '#F97316', // Orange (Sales/Service)
    '#EF4444', // Red/Coral (Finance/Accessories)
    '#06B6D4', // Teal (HR/Bodyshop)
    '#10B981', // Green (IT/Spares)
    '#8B5CF6', // Purple (Operations/Others)
    '#F59E0B', // Amber
    '#EC4899', // Pink
  ];

  // Helper to format values dynamically based on metric mode
  const formatSliceValue = (val) => {
    const num = Number(val || 0);
    if (metricMode === 'revenue') {
      if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
      if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
      if (num >= 1000) return `₹${(num / 1000).toFixed(1)} K`;
      return `₹${num.toLocaleString('en-IN')}`;
    }
    if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr PTS`;
    if (num >= 100000) return `${(num / 100000).toFixed(1)} L PTS`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)} K PTS`;
    return `${num.toLocaleString('en-IN')} PTS`;
  };

  // 1. Build Department Slices
  const deptData = (() => {
    const raw = departments && departments.length > 0 ? departments : [
      { category: 'sale', revenue_volume: 2036831697, points_issued: 20584600, points_redeemed: 0 },
      { category: 'service', revenue_volume: 3829540, points_issued: 182858, points_redeemed: 135160 },
      { category: 'accessory', revenue_volume: 49400, points_issued: 988, points_redeemed: 32400 },
      { category: 'bodyshop', revenue_volume: 0, points_issued: 0, points_redeemed: 0 },
    ];

    const labels = {
      sale: 'Vehicle Sales',
      service: 'Workshop Service',
      accessory: 'Genuine Accessories',
      bodyshop: 'Bodyshop & Repairs',
    };

    const getVal = (d) => {
      if (metricMode === 'redeemed') return Number(d.points_redeemed || 0);
      if (metricMode === 'revenue') return Number(d.revenue_volume || 0);
      return Number(d.points_issued || 0);
    };

    const total = raw.reduce((sum, d) => sum + getVal(d), 0) || 1;

    return raw
      .map((d, i) => {
        const val = getVal(d);
        const pct = (val / total) * 100;
        return {
          id: d.category,
          label: labels[d.category] || d.category,
          value: val,
          revenue: Number(d.revenue_volume || 0),
          points_issued: Number(d.points_issued || 0),
          points_redeemed: Number(d.points_redeemed || 0),
          pct: Number(pct.toFixed(1)),
          color: COLORS[i % COLORS.length],
        };
      })
      .filter((d) => d.value > 0 || d.pct > 0);
  })();

  // 2. Build Brand Slices (Grouped from Models)
  const brandData = (() => {
    if (!models || models.length === 0) return [];
    const brandMap = new Map();

    const getVal = (m) => {
      if (metricMode === 'redeemed') return Number(m.points_redeemed || 0);
      if (metricMode === 'revenue') return Number(m.estimated_revenue || 0);
      return Number(m.points_issued || 0);
    };

    models.forEach((m) => {
      const bName = m.brand_name || 'Other OEM';
      const cur = brandMap.get(bName) || { label: bName, value: 0, units: 0 };
      cur.value += getVal(m);
      cur.units += Number(m.vehicle_count || 0);
      brandMap.set(bName, cur);
    });

    const list = Array.from(brandMap.values());
    const total = list.reduce((sum, b) => sum + b.value, 0) || 1;

    return list
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((b, i) => {
        const pct = (b.value / total) * 100;
        return {
          id: b.label,
          label: b.label,
          value: b.value,
          units: b.units,
          pct: Number(pct.toFixed(1)),
          color: COLORS[i % COLORS.length],
        };
      });
  })();

  const activeDataset = viewMode === 'department' ? deptData : brandData;
  const totalValue = activeDataset.reduce((sum, d) => sum + d.value, 0) || 1;

  // Compute SVG Pie Slices Trigonometry
  const cx = 150;
  const cy = 150;
  const radius = 115;

  let cumulativeAngle = -Math.PI / 2; // Start from top 12 o'clock

  const slices = activeDataset.map((item, idx) => {
    const fraction = item.value / totalValue;
    const angle = fraction * 2 * Math.PI;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArc = angle > Math.PI ? 1 : 0;
    const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    // Percentage Label Coordinates (inside slice)
    const midAngle = (startAngle + endAngle) / 2;
    const labelRadius = radius * 0.65;
    const lx = cx + labelRadius * Math.cos(midAngle);
    const ly = cy + labelRadius * Math.sin(midAngle);

    // Callout coordinates (outside slice for prominent slices)
    const calloutRadius = radius + 14;
    const px = cx + calloutRadius * Math.cos(midAngle);
    const py = cy + calloutRadius * Math.sin(midAngle);
    const isRight = Math.cos(midAngle) > 0;

    return {
      ...item,
      pathD,
      lx,
      ly,
      px,
      py,
      isRight,
      angleDeg: (midAngle * 180) / Math.PI,
    };
  });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
      {/* Header with Segment Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              {viewMode === 'department' ? 'Loyalty Share by Department' : 'Loyalty Share by Dealership Brand'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Proportional breakdown of points issuance &amp; business vertical contribution
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('department')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'department'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Departments
          </button>
          <button
            type="button"
            onClick={() => setViewMode('brand')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'brand'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Brands
          </button>
        </div>
      </div>

      {/* Metric Mode Toggle (Points Earned | Points Redeemed | Cash Inflow) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMetricMode('issued')}
            className={`px-3 py-1 rounded-xl transition-all ${
              metricMode === 'issued'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Points Redeemed (-PTS)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('revenue')}
            className={`px-3 py-1 rounded-xl transition-all ${
              metricMode === 'revenue'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cash Inflow (₹)
          </button>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Showing: {metricMode === 'issued' ? 'Points Earned' : metricMode === 'redeemed' ? 'Points Redeemed' : 'Revenue Inflow'}
        </span>
      </div>

      {/* Main Content: Pie SVG (Left) + Legend Card (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-4">
        {/* SVG Pie Chart Canvas (7 cols) */}
        <div className="md:col-span-7 flex items-center justify-center relative">
          <svg
            viewBox="0 0 300 300"
            className="w-full max-w-[280px] h-auto select-none overflow-visible"
          >
            {slices.map((slice, idx) => {
              const isHovered = hoveredSlice === idx;
              return (
                <g
                  key={`slice-${idx}`}
                  onMouseEnter={() => setHoveredSlice(idx)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className="cursor-pointer transition-transform duration-200"
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  }}
                >
                  {/* Slice Wedge */}
                  <path
                    d={slice.pathD}
                    fill={slice.color}
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    className="transition-all duration-300"
                    opacity={hoveredSlice === null || isHovered ? 1 : 0.7}
                  />

                  {/* Percentage Text on Slice (if >= 4%) */}
                  {slice.pct >= 4 && (
                    <text
                      x={slice.lx}
                      y={slice.ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#FFFFFF"
                      fontSize="11"
                      fontWeight="900"
                      className="font-mono drop-shadow-sm pointer-events-none"
                    >
                      {slice.pct}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend Card (Pixel-matched to Screenshot 2) (5 cols) */}
        <div className="md:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            {viewMode === 'department' ? 'Departments' : 'Dealership Brands'}
          </h4>

          <div className="space-y-2.5">
            {slices.map((item, idx) => {
              const isHovered = hoveredSlice === idx;
              return (
                <div
                  key={`leg-${idx}`}
                  onMouseEnter={() => setHoveredSlice(idx)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`flex items-center justify-between text-xs p-1.5 rounded-xl cursor-pointer transition-all ${
                    isHovered ? 'bg-slate-100 font-bold scale-[1.02]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-xs flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-800 font-bold truncate">
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono flex-shrink-0">
                    <span className="text-slate-500 text-[11px]">
                      {formatSliceValue(item.value)}
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
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <span>Click or hover any slice to isolate channel volume</span>
        <span className="font-mono font-bold text-slate-800">
          Total: {formatSliceValue(totalValue)}
        </span>
      </div>
    </div>
  );
};

export default DistributionPieChart;

