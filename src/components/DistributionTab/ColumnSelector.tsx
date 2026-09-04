import React, { useState } from 'react';
import type { ColumnMissingStat, ColumnType } from '../../types/data';
import { Search, Hash, Type, Calendar, CheckSquare } from 'lucide-react';

interface ColumnSelectorProps {
  columns: string[];
  stats: ColumnMissingStat[];
  selectedColumn: string;
  onSelect: (col: string) => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  stats,
  selectedColumn,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'numeric' | 'categorical'>('all');

  const statsMap = new Map(stats.map((s) => [s.name, s]));

  const filteredColumns = columns.filter((col) => {
    const s = statsMap.get(col);
    if (!col.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter === 'numeric') return s?.type === 'numeric';
    if (typeFilter === 'categorical') return s?.type !== 'numeric';
    return true;
  });

  const getTypeIcon = (type?: ColumnType) => {
    switch (type) {
      case 'numeric':
        return <Hash className="w-3.5 h-3.5 text-blue-500" />;
      case 'datetime':
        return <Calendar className="w-3.5 h-3.5 text-amber-500" />;
      case 'boolean':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Type className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col h-full shadow-sm">
      <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 mb-2 px-1">
        欄位清單 ({columns.length})
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋欄位..."
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Type Filter Pills */}
      <div className="flex gap-1 mb-2">
        {(['all', 'numeric', 'categorical'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setTypeFilter(filter)}
            className={`flex-1 py-1 text-[11px] rounded font-medium transition-all ${
              typeFilter === filter
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {filter === 'all' ? '全部' : filter === 'numeric' ? '數值' : '類別'}
          </button>
        ))}
      </div>

      {/* Column list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[520px]">
        {filteredColumns.map((col) => {
          const s = statsMap.get(col);
          const isSelected = selectedColumn === col;

          return (
            <button
              key={col}
              onClick={() => onSelect(col)}
              className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-all text-xs ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span className={isSelected ? 'text-white' : ''}>{getTypeIcon(s?.type)}</span>
                <span className="truncate">{col}</span>
              </div>

              {s && s.missingRate > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected
                      ? 'bg-blue-700 text-blue-100'
                      : s.missingRate > 20
                      ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                  }`}
                  title={`缺失: ${s.missingCount} 筆 (${s.missingRate}%)`}
                >
                  {s.missingRate}% 缺
                </span>
              )}
            </button>
          );
        })}

        {filteredColumns.length === 0 && (
          <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">無符合條件之欄位</div>
        )}
      </div>
    </div>
  );
};
