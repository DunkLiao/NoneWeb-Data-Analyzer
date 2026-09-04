import React, { useRef } from 'react';
import { COMMON_ENCODINGS } from '../utils/parser';
import { UploadCloud, FileSpreadsheet, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (file: File, encoding?: string) => void;
  onSheetChanged?: (sheetName: string) => void;
  onEncodingChanged?: (encoding: string) => void;
  onLoadSample: () => void;
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
            {isExcel ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">{filename}</span>
              <span className="text-[11px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                已載入
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
              <span>格式: {isExcel ? 'Excel 活頁簿' : '純文字分隔資料 (CSV/TSV)'}</span>
            </div>
          </div>
        </div>

        {/* Controls: Sheet switch & Encoding switch */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Excel sheets */}
          {isExcel && sheetNames.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">工作表:</span>
              <select
                value={activeSheet}
                onChange={(e) => onSheetChanged && onSheetChanged(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {sheetNames.map((sheet) => (
                  <option key={sheet} value={sheet} className="bg-slate-900 text-slate-200">
                    {sheet}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Encoding selector for CSV */}
          {!isExcel && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">文字編碼:</span>
              <select
                value={encoding}
                onChange={(e) => onEncodingChanged && onEncodingChanged(e.target.value)}
                className="bg-transparent text-blue-400 font-medium focus:outline-none cursor-pointer"
              >
                {COMMON_ENCODINGS.map((enc) => (
                  <option key={enc.value} value={enc.value} className="bg-slate-900 text-slate-200">
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

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
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
    <div className="mb-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-900/60 hover:bg-slate-900 transition-all rounded-2xl p-10 text-center cursor-pointer group shadow-lg"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all mx-auto flex items-center justify-center mb-4 shadow-inner">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-1">
          點擊選擇檔案，或將檔案拖放至此處
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
          支援 CSV、TSV、Excel (.xlsx, .xls) 格式。內建繁體中文 Big5 / UTF-8 編碼自動識別與多工作表切換。
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
          <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 font-mono">
            .csv
          </span>
          <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 font-mono">
            .tsv
          </span>
          <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 font-mono">
            .xlsx
          </span>
          <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 font-mono">
            .xls
          </span>
        </div>
      </div>

      {/* Sample dataset prompt */}
      <div className="mt-3 flex items-center justify-between px-3 py-2 bg-slate-900/40 border border-slate-800/80 rounded-xl text-xs">
        <span className="text-slate-400">沒有準備好的檔案嗎？您可以一鍵載入真實分析範例資料進行體驗：</span>
        <button
          onClick={onLoadSample}
          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-medium border border-blue-500/30 transition-colors"
        >
          載入範例資料 (醫療健檢數據集)
        </button>
      </div>
    </div>
  );
};
