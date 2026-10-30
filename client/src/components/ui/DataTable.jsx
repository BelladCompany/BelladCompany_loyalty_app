import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Clean Light Modern DataTable Component (Image 1 & 2 Reference)
 * Features 15-16px legible typography, smooth zebra striping, soft borders, and clear sort headers.
 */
export const DataTable = ({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No records found.',
  className = '',
}) => {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (!field) return;
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  return (
    <div className={`w-full overflow-x-auto overscroll-x-contain border border-slate-200/90 rounded-2xl bg-white shadow-xs ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600">
            {columns.map((col, idx) => (
              <th
                key={idx}
                onClick={() => col.sortable && handleSort(col.field)}
                className={`
                  h-10 sm:h-12 px-2.5 sm:px-5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 select-none whitespace-nowrap
                  ${col.sortable ? 'cursor-pointer hover:bg-slate-100 hover:text-slate-800' : ''}
                  ${col.align === 'right' ? 'text-right' : 'text-left'}
                  ${col.headerClassName || ''}
                `}
              >
                <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end w-full' : ''}`}>
                  <span>{col.header}</span>
                  {col.sortable && (
                    <span className="text-slate-400">
                      {sortField === col.field ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 font-bold" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-40 hover:opacity-100" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 sm:h-28 text-center text-slate-400 text-xs sm:text-sm font-semibold">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => (
              <tr
                key={row[keyField] || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`
                  h-12 sm:h-14 transition-colors text-slate-800 text-xs sm:text-sm font-medium
                  ${onRowClick ? 'cursor-pointer hover:bg-indigo-50/40 active:bg-indigo-50' : 'hover:bg-slate-50/70'}
                  ${rowIdx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}
                `}
              >
                {columns.map((col, colIdx) => {
                  const val = row[col.field];
                  return (
                    <td
                      key={colIdx}
                      className={`
                        px-2.5 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm
                        ${col.align === 'right' ? 'text-right' : 'text-left'}
                        ${col.cellClassName || ''}
                      `}
                    >
                      {col.render ? col.render(val, row) : (val ?? '—')}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
