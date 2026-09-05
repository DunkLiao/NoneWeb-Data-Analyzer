import React, { useRef } from 'react';
import { COMMON_ENCODINGS } from '../utils/parser';
import { UploadCloud, FileSpreadsheet, RefreshCw, FileText, CheckCircle2, Database } from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (file: File, encoding?: string) => void;
  onSheetChanged?: (sheetName: string) => void;
  onEncodingChanged?: (encoding: string) => void;
  onLoadSample: () => void;
  onOpenDatabase?: () => void;
  filename?: string;
  encoding?: string;
  sheetNames?: string[];
  activeSheet?: string;
  isExcel?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
  onSheetChanged,
  onEncodingChanged,
  onLoadSample,
  onOpenDatabase,
  filename,
  encoding = 'UTF-8',
  sheetNames = [],
  activeSheet,
  isExcel = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileLoaded(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileLoaded(e.target.files[0]);
    }
  };

  // If file is loaded, render the file toolbar banner
  if (filename) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400">
            {isExcel ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{filename}</span>
              <span className="text-[11px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                已載入
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
              <span>格式: {isExcel ? 'Excel 活頁簿' : '純文字分隔資料 (CSV/TSV)'}</span>
            </div>
          </div>
        </div>

        {/* Controls: Sheet switch & Encoding switch */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Excel sheets */}
          {isExcel && sheetNames.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">工作表:</span>
              <select
                value={activeSheet}
                onChange={(e) => onSheetChanged && onSheetChanged(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {sheetNames.map((sheet) => (
                  <option key={sheet} value={sheet} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {sheet}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Encoding selector for CSV */}
          {!isExcel && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">文字編碼:</span>
              <select
                value={encoding}
                onChange={(e) => onEncodingChanged && onEncodingChanged(e.target.value)}
                className="bg-transparent text-blue-600 dark:text-blue-400 font-medium focus:outline-none cursor-pointer"
              >
                {COMMON_ENCODINGS.map((enc) => (
                  <option key={enc.value} value={enc.value} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {enc.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            onChange={handleInputChange}
            className="hidden"
          />

          {onOpenDatabase && (
            <button
              onClick={onOpenDatabase}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-indigo-200 dark:border-indigo-700/60"
            >
              <Database className="w-3.5 h-3.5" />
              連線資料庫
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            更換檔案
          </button>
        </div>
      </div>
    );
  }

  // File Upload Dropzone
  return (
    <div className="mb-6 space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-2xl p-10 text-center cursor-pointer group shadow-sm"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all mx-auto flex items-center justify-center mb-4 shadow-inner">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
          點擊選擇檔案，或將檔案拖放至此處
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
          支援 CSV、TSV、Excel (.xlsx, .xls) 格式。內建繁體中文 Big5 / UTF-8 編碼自動識別與多工作表切換。
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 font-mono">
            .csv
          </span>
          <span className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 font-mono">
            .tsv
          </span>
          <span className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 font-mono">
            .xlsx
          </span>
          <span className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 font-mono">
            .xls
          </span>
        </div>
      </div>

      {/* Database connection prompt card */}
      {onOpenDatabase && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  連線關聯式資料庫 (Oracle & SQLite)
                </h4>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.2 rounded-full font-medium">
                  下 SQL 撈取資料源
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                直接讀取本機 SQLite 檔案或遠端 Oracle Database，執行自訂 SQL 查詢並載入深度診斷分析
              </p>
            </div>
          </div>
          <button
            onClick={onOpenDatabase}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
          >
            <Database className="w-4 h-4" />
            資料庫連線與查詢
          </button>
        </div>
      )}

      {/* Sample dataset prompt */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs">
        <span className="text-slate-600 dark:text-slate-400">沒有準備好的檔案或資料庫嗎？您可以一鍵載入真實分析範例資料進行體驗：</span>
        <button
          onClick={onLoadSample}
          className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-600 dark:text-blue-400 font-medium border border-blue-200 dark:border-blue-500/30 transition-colors"
        >
          載入範例資料 (醫療健檢數據集)
        </button>
      </div>
    </div>
  );
};
