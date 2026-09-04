import React, { useState, useMemo } from 'react';
import type { ParsedDataset } from '../../types/data';
import type { CleaningOptions } from '../../utils/cleaner';
import { cleanDataset, exportToCsv, exportToExcel } from '../../utils/cleaner';
import { X, Sparkles, Download, CheckCircle, ArrowRight } from 'lucide-react';

interface MissingCleanerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: ParsedDataset;
  onApply: (cleaned: ParsedDataset) => void;
}

export const MissingCleanerModal: React.FC<MissingCleanerModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onApply,
}) => {
  const [options, setOptions] = useState<CleaningOptions>({
    dropRowsWithMissing: false,
    dropColThreshold: 100,
    imputeNumeric: 'none',
    imputeCategorical: 'none',
    customConstantText: '缺失值',
  });

  // Calculate preview data
  const preview = useMemo(() => {
    return cleanDataset(dataset, options);
  }, [dataset, options]);

  if (!isOpen) return null;

  const originalRows = dataset.rows.length;
  const originalCols = dataset.columns.length;
  const newRows = preview.rows.length;
  const newCols = preview.columns.length;

  const rowsDropped = originalRows - newRows;
  const colsDropped = originalCols - newCols;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">快速資料清理與缺失處理預覽</h3>
              <p className="text-xs text-slate-400">設定缺失值剔除或填補規則，並可即時匯出清洗後之資料</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Summary Preview Banner */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="text-xs text-slate-400 mb-1">列數變化 (Rows)</div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-slate-300">{originalRows.toLocaleString()}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className={rowsDropped > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {newRows.toLocaleString()} 列
                </span>
                {rowsDropped > 0 && (
                  <span className="text-xs text-red-400 font-normal">(-{rowsDropped})</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">欄數變化 (Columns)</div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-slate-300">{originalCols}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className={colsDropped > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {newCols} 欄
                </span>
                {colsDropped > 0 && (
                  <span className="text-xs text-red-400 font-normal">(-{colsDropped})</span>
                )}
              </div>
            </div>
          </div>

          {/* Option 1: Drop rows */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.dropRowsWithMissing}
                onChange={(e) => setOptions({ ...options, dropRowsWithMissing: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
              />
              <div>
                <div className="text-sm font-medium text-slate-200">剔除任何含有缺失值的列 (Drop NA Rows)</div>
                <div className="text-xs text-slate-400">只保留完全無缺值的完整樣本（Complete Cases）</div>
              </div>
            </label>
          </div>

          {/* Option 2: Column threshold */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-200">剔除高缺失率欄位門檻</span>
              <span className="text-xs text-blue-400 font-mono font-medium">
                {options.dropColThreshold === 100 ? '不剔除任何欄位' : `缺失率 > ${options.dropColThreshold}% 則剔除`}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={options.dropColThreshold}
              onChange={(e) => setOptions({ ...options, dropColThreshold: Number(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>嚴格 (10%)</span>
              <span>中等 (50%)</span>
              <span>保留所有欄位 (100%)</span>
            </div>
          </div>

          {/* Option 3: Numeric Imputation */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="text-sm font-medium text-slate-200">數值型欄位缺失補值 (Numeric Imputation)</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[
                { label: '不填補 (保留缺值)', value: 'none' },
                { label: '平均值 (Mean)', value: 'mean' },
                { label: '中位數 (Median)', value: 'median' },
                { label: '補 0 (Zero)', value: 'zero' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setOptions({ ...options, imputeNumeric: item.value as any })}
                  className={`py-2 px-3 rounded-lg border text-center transition-all ${
                    options.imputeNumeric === item.value
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Option 4: Categorical Imputation */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="text-sm font-medium text-slate-200">類別型欄位缺失補值 (Categorical Imputation)</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: '不填補 (保留缺值)', value: 'none' },
                { label: '眾數 (Mode)', value: 'mode' },
                { label: '自訂文字標記', value: 'constant' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setOptions({ ...options, imputeCategorical: item.value as any })}
                  className={`py-2 px-3 rounded-lg border text-center transition-all ${
                    options.imputeCategorical === item.value
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {options.imputeCategorical === 'constant' && (
              <div className="pt-2">
                <input
                  type="text"
                  value={options.customConstantText}
                  onChange={(e) => setOptions({ ...options, customConstantText: e.target.value })}
                  placeholder="自訂文字，例如：未知 / 缺失"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex gap-2">
            <button
              onClick={() => exportToCsv(preview.rows, preview.columns, preview.filename)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              匯出 CSV
            </button>
            <button
              onClick={() => exportToExcel(preview.rows, preview.columns, preview.filename)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              匯出 Excel
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              取消
            </button>
            <button
              onClick={() => {
                onApply(preview);
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              套用至主畫面
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
