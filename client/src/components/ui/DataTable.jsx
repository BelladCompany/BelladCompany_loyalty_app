import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * High-contrast, sortable DataTable component for operational counters
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
    <div className={`w-full overflow-x-auto border border-surface-border rounded bg-white ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-surface-border">
            {columns.map((col, idx) => (
              <th
                key={idx}
                onClick={() => col.sortable && handleSort(col.field)}
                className={`
                  h-12 px-4 text-base font-bold text-ink-primary select-none
                  ${col.sortable ? 'cursor-pointer hover:bg-slate-200' : ''}
                  ${col.align === 'right' ? 'text-right' : 'text-left'}
                  ${col.headerClassName || ''}
                `}
              >
                <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end w-full' : ''}`}>
                  <span>{col.header}</span>
                  {col.sortable && (
                    <span className="text-ink-secondary">
                      {sortField === col.field ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-action-primary" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-action-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-40" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-divider">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center text-ink-secondary text-base font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => (
              <tr
                key={row[keyField] || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`
                  min-h-[48px] h-12 transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100' : 'hover:bg-slate-50/50'}
                  ${rowIdx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}
                `}
              >
                {columns.map((col, colIdx) => {
                  const cellValue = col.render ? col.render(row[col.field], row) : row[col.field];
                  return (
                    <td
                      key={colIdx}
                      className={`
                        px-4 py-3 text-base text-ink-primary font-medium
                        ${col.align === 'right' ? 'text-right font-mono' : 'text-left'}
                        ${col.cellClassName || ''}
                      `}
                    >
                      {cellValue}
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
