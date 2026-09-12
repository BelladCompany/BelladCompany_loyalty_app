import React from 'react';

/**
 * Skeleton loading placeholder components for all data-loading states.
 * Uses CSS shimmer animation so nothing ever looks "broken" while data fetches.
 */

// ── Base shimmer animation ───────────────────────────────────────────────────
function ShimmerBar({ className = '' }) {
  return (
    <div
      className={`rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:300%_100%] animate-shimmer ${className}`}
    />
  );
}

// ── Skeleton.Line ────────────────────────────────────────────────────────────
// A single shimmering text-like line.
// Usage: <Skeleton.Line width="w-3/4" height="h-4" />
function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }) {
  return <ShimmerBar className={`${height} ${width} ${className}`} />;
}

// ── Skeleton.Card ────────────────────────────────────────────────────────────
// A generic card-shaped skeleton with optional header and body lines.
// Usage: <Skeleton.Card lines={3} />
function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`bg-white border border-surface-border rounded-xl p-5 space-y-4 shadow-sm ${className}`}>
      {/* Card header */}
      <div className="space-y-2">
        <ShimmerBar className="h-5 w-1/3" />
        <ShimmerBar className="h-4 w-1/2" />
      </div>
      {/* Content lines */}
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: lines }).map((_, i) => (
          <ShimmerBar key={i} className="h-4" style={{ width: `${90 - i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

// ── Skeleton.StatCard ────────────────────────────────────────────────────────
// Matches the shape of a StatCard metric block.
function SkeletonStatCard({ className = '' }) {
  return (
    <div className={`bg-white border border-surface-border rounded-xl p-5 space-y-3 shadow-sm ${className}`}>
      <ShimmerBar className="h-3 w-2/5" />
      <ShimmerBar className="h-8 w-3/5" />
      <ShimmerBar className="h-3 w-4/5" />
    </div>
  );
}

// ── Skeleton.Table ───────────────────────────────────────────────────────────
// A realistic table skeleton with configurable rows and columns.
// Usage: <Skeleton.Table rows={5} cols={4} />
function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`bg-white border border-surface-border rounded-xl overflow-hidden shadow-sm ${className}`}>
      {/* Table header */}
      <div className="border-b border-surface-border bg-slate-50 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <ShimmerBar key={i} className="h-3 w-3/4" />
        ))}
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="border-b border-surface-divider px-4 py-3.5 grid gap-4"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <ShimmerBar
              key={colIdx}
              className="h-4"
              style={{ width: colIdx === 0 ? '60%' : colIdx === cols - 1 ? '40%' : '75%' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Skeleton.CustomerProfile ──────────────────────────────────────────────────
// Matches Customer360View's initial load shape.
function SkeletonCustomerProfile({ className = '' }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary card */}
      <div className="bg-white border border-surface-border rounded-xl p-5 flex items-center gap-5 shadow-sm">
        <ShimmerBar className="h-16 w-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <ShimmerBar className="h-5 w-1/3" />
          <ShimmerBar className="h-4 w-1/4" />
          <ShimmerBar className="h-4 w-2/5" />
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <ShimmerBar className="h-11 w-32 rounded-lg" />
          <ShimmerBar className="h-11 w-32 rounded-lg" />
        </div>
      </div>
      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)}
      </div>
      {/* Ledger table */}
      <SkeletonTable rows={6} cols={6} />
    </div>
  );
}

// ── Skeleton.KycQueue ────────────────────────────────────────────────────────
// Matches the KYC Approvals queue card shapes.
function SkeletonKycQueue({ items = 3, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white border-2 border-surface-border rounded-lg p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShimmerBar className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <ShimmerBar className="h-5 w-40" />
                <ShimmerBar className="h-3 w-56" />
              </div>
            </div>
            <ShimmerBar className="h-7 w-28 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <ShimmerBar className="h-16 rounded-lg" />
            <ShimmerBar className="h-16 rounded-lg" />
            <ShimmerBar className="h-16 rounded-lg" />
          </div>
          <div className="flex justify-end gap-3">
            <ShimmerBar className="h-10 w-32 rounded-lg" />
            <ShimmerBar className="h-10 w-40 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Named export namespace ───────────────────────────────────────────────────
export const Skeleton = {
  Line: SkeletonLine,
  Card: SkeletonCard,
  StatCard: SkeletonStatCard,
  Table: SkeletonTable,
  CustomerProfile: SkeletonCustomerProfile,
  KycQueue: SkeletonKycQueue,
};

export default Skeleton;
