import React, { useState, useMemo } from 'react';
import type { ColumnType } from '../../types/data';
import { isValueMissing } from '../../utils/parser';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Hash,
  Type,
  Calendar,
  CheckSquare,
} from 'lucide-react';

interface DataTableProps {
  rows: Record<string, any>[];
  columns: string[];
  columnTypes: Record<string, ColumnType>;
}

export const DataTable: React.FC<DataTableProps> = ({ rows, columns, columnTypes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Filter & Sort
  const processedRows = useMemo(() => {
    let result = rows;

    // Filter only missing
    if (onlyMissing) {
      result = result.filter((row) => columns.some((col) => isValueMissing(row[col])));
    }

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
        })
      );
    }

    // Sort
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];

        if (isValueMissing(valA)) return 1;
        if (isValueMissing(valB)) return -1;

        if (columnTypes[sortCol] === 'numeric') {
          return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        } else {
          return sortAsc
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return result;
  }, [rows, columns, columnTypes, onlyMissing, searchTerm, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = processedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortAsc) setSortAsc(false);
      else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const getTypeIcon = (type: ColumnType) => {
    switch (type) {
      case 'numeric':
        return <Hash className="w-3 h-3 text-blue-400" />;
      case 'datetime':
        return <Calendar className="w-3 h-3 text-amber-400" />;
      case 'boolean':
        return <CheckSquare className="w-3 h-3 text-emerald-400" />;
      default:
        return <Type className="w-3 h-3 text-purple-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="搜尋表格資料..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56"
            />
          </div>

          {/* Filter toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 select-none">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => {
                setOnlyMissing(e.target.checked);
                setPage(1);
              }}
              className="w-3.5 h-3.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
            />
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>僅顯示含缺失值列</span>
          </label>
        </div>

        <div className="text-xs text-slate-400">
          符合條件：<strong className="text-slate-200">{processedRows.length.toLocaleString()}</strong> 列
          (共 {rows.length.toLocaleString()} 列)
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-[560px]">
        <table className="w-full text-xs text-left text-slate-300 border-collapse">
          <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10 border-b border-slate-800 select-none">
            <tr>
              <th className="py-2.5 px-3 w-14 bg-slate-950 text-slate-500 border-r border-slate-800">
                #
              </th>
              {columns.map((col) => {
                const isSorted = sortCol === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-2.5 px-3 font-semibold hover:bg-slate-900 cursor-pointer transition-colors border-r border-slate-800/60 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{getTypeIcon(columnTypes[col])}</span>
                      <span className={isSorted ? 'text-blue-400' : 'text-slate-300'}>{col}</span>
                      {isSorted ? (
                        sortAsc ? (
                          <ArrowUp className="w-3 h-3 text-blue-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-blue-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {paginatedRows.map((row, rowIdx) => {
              const actualRowIndex = (currentPage - 1) * pageSize + rowIdx + 1;
              return (
                <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 text-slate-500 text-[11px] bg-slate-950/40 border-r border-slate-800">
                    {actualRowIndex}
                  </td>
                  {columns.map((col) => {
                    const val = row[col];
                    const isMissing = isValueMissing(val);

                    return (
                      <td
                        key={col}
                        className={`py-2 px-3 border-r border-slate-800/60 truncate max-w-xs ${
                          isMissing
                            ? 'bg-red-950/40 text-red-400 font-semibold'
                            : 'text-slate-300'
                        }`}
                      >
                        {isMissing ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-red-900/60 border border-red-700/60 font-sans tracking-wide">
                            &lt;NULL&gt;
                          </span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {paginatedRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-slate-500">
                  沒有符合篩選條件的資料列
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div>
          第 {(currentPage - 1) * pageSize + 1} 至{' '}
          {Math.min(currentPage * pageSize, processedRows.length)} 筆，共{' '}
          {processedRows.length.toLocaleString()} 筆
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2">
            頁碼 <strong className="text-slate-200">{currentPage}</strong> / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
