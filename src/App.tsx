import { useState, useMemo } from 'react';
import type { ActiveTab, ParsedDataset } from './types/data';
import { parseFile } from './utils/parser';
import { calcOverallMissing, calcColumnMissingStats, generateNullityMatrix, calcNullityCorrelation } from './utils/missingAnalysis';
import { generateSampleDataset } from './utils/sampleData';
import { exportHtmlReport } from './utils/exportReport';

// Components
import { FileUploader } from './components/FileUploader';
import { OverviewMetrics } from './components/OverviewMetrics';
import { MissingMatrix } from './components/MissingValueTab/MissingMatrix';
import { MissingBarChart } from './components/MissingValueTab/MissingBarChart';
import { MissingCorrelation } from './components/MissingValueTab/MissingCorrelation';
import { MissingCleanerModal } from './components/MissingValueTab/MissingCleanerModal';
import { ColumnSelector } from './components/DistributionTab/ColumnSelector';
import { NumericDistView } from './components/DistributionTab/NumericDistView';
import { CategoryDistView } from './components/DistributionTab/CategoryDistView';
import { CorrelationMatrixView } from './components/DistributionTab/CorrelationMatrixView';
import { DataTable } from './components/DataGridTab/DataTable';

// Icons
import {
  FileText,
  PieChart,
  Grid,
  Layers,
  Sparkles,
  Download,
  Flame,
  Home,
} from 'lucide-react';

export function App() {
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('missing');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [isCleanerOpen, setIsCleanerOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  // Return to home screen
  const handleGoHome = () => {
    setDataset(null);
    setCurrentFile(null);
    setSelectedColumn('');
    setActiveTab('missing');
  };

  // Load sample dataset
  const handleLoadSample = () => {
    const sample = generateSampleDataset();
    setDataset(sample);
    setSelectedColumn(sample.columns[1]); // default to first numeric column '年齡'
  };

  // Handle uploaded file
  const handleFileLoaded = async (file: File, forcedEncoding?: string) => {
    try {
      setCurrentFile(file);
      const parsed = await parseFile(file, forcedEncoding);
      setDataset(parsed);
      setSelectedColumn(parsed.columns[0] || '');
    } catch (err: any) {
      alert(`讀取檔案失敗: ${err.message || err}`);
    }
  };

  // Switch Excel Sheet
  const handleSheetChanged = async (sheetName: string) => {
    if (!currentFile) return;
    try {
      const parsed = await parseFile(currentFile, undefined, sheetName);
      setDataset(parsed);
      setSelectedColumn(parsed.columns[0] || '');
    } catch (err: any) {
      alert(`切換工作表失敗: ${err.message || err}`);
    }
  };

  // Switch Encoding
  const handleEncodingChanged = async (encoding: string) => {
    if (!currentFile) return;
    try {
      const parsed = await parseFile(currentFile, encoding);
      setDataset(parsed);
    } catch (err: any) {
      alert(`切換編碼失敗: ${err.message || err}`);
    }
  };

  // Calculations
  const overall = useMemo(() => {
    if (!dataset) return null;
    return calcOverallMissing(dataset.rows, dataset.columns);
  }, [dataset]);

  const columnStats = useMemo(() => {
    if (!dataset) return [];
    return calcColumnMissingStats(dataset.rows, dataset.columns, dataset.columnTypes);
  }, [dataset]);

  const nullityMatrix = useMemo(() => {
    if (!dataset) return null;
    return generateNullityMatrix(dataset.rows, dataset.columns);
  }, [dataset]);

  const nullityCorr = useMemo(() => {
    if (!dataset) return null;
    return calcNullityCorrelation(dataset.rows, dataset.columns);
  }, [dataset]);

  const numericColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter((c) => dataset.columnTypes[c] === 'numeric');
  }, [dataset]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div
          onClick={handleGoHome}
          className="flex items-center gap-3 cursor-pointer select-none group"
          title="點選回到首頁（重新選擇或上傳檔案）"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-black text-lg group-hover:scale-105 group-hover:shadow-blue-500/40 transition-all">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight group-hover:text-blue-400 transition-colors">
                NoneWeb Data Analyzer
              </h1>
              <span className="text-[10px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60 px-2 py-0.5 rounded-md">
                免安裝綠色版
              </span>
            </div>
            <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
              高效能離線資料缺失值與分布統計分析器
            </p>
          </div>
        </div>

        {dataset && (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleGoHome}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 font-medium transition-all"
              title="回到首頁"
            >
              <Home className="w-3.5 h-3.5" />
              回到首頁
            </button>
            <button
              onClick={() => setIsCleanerOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5 font-medium transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              缺失清洗與補值
            </button>
            <button
              onClick={() => exportHtmlReport(dataset)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 font-medium shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              匯出診斷報告 (HTML)
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* File Uploader Bar / Dropzone */}
        <FileUploader
          filename={dataset?.filename}
          encoding={dataset?.encoding}
          sheetNames={dataset?.sheetNames}
          activeSheet={dataset?.activeSheet}
          isExcel={!!dataset?.sheetNames}
          onFileLoaded={handleFileLoaded}
          onSheetChanged={handleSheetChanged}
          onEncodingChanged={handleEncodingChanged}
          onLoadSample={handleLoadSample}
        />

        {dataset && overall && (
          <>
            {/* Overview Metric Cards */}
            <OverviewMetrics dataset={dataset} overall={overall} />

            {/* View Tabs */}
            <div className="flex items-center border-b border-slate-800 mb-6 gap-2 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('missing')}
                className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'missing'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                缺失值深度分析 (Missing Values)
              </button>

              <button
                onClick={() => setActiveTab('distribution')}
                className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'distribution'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <PieChart className="w-4 h-4" />
                數據分布分析 (Distribution)
              </button>

              <button
                onClick={() => setActiveTab('correlation')}
                className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'correlation'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-4 h-4" />
                相關性矩陣 (Correlation Heatmap)
              </button>

              <button
                onClick={() => setActiveTab('grid')}
                className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'grid'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Grid className="w-4 h-4" />
                原始資料與高亮 (Data Explorer)
              </button>
            </div>

            {/* Tab 1: Missing Value Analysis */}
            {activeTab === 'missing' && nullityMatrix && nullityCorr && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <MissingMatrix
                  matrixData={nullityMatrix}
                  totalRows={overall.totalRows}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MissingBarChart stats={columnStats} />
                  <MissingCorrelation correlation={nullityCorr} />
                </div>
              </div>
            )}

            {/* Tab 2: Distribution Analysis */}
            {activeTab === 'distribution' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-150">
                <div className="md:col-span-1">
                  <ColumnSelector
                    columns={dataset.columns}
                    stats={columnStats}
                    selectedColumn={selectedColumn}
                    onSelect={setSelectedColumn}
                  />
                </div>
                <div className="md:col-span-3">
                  {selectedColumn && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-100">{selectedColumn}</h3>
                            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                              {dataset.columnTypes[selectedColumn]}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            單變量統計特徵與機率密度視覺化
                          </p>
                        </div>
                      </div>

                      {dataset.columnTypes[selectedColumn] === 'numeric' ? (
                        <NumericDistView
                          columnName={selectedColumn}
                          values={dataset.rows.map((r) => r[selectedColumn])}
                        />
                      ) : (
                        <CategoryDistView
                          columnName={selectedColumn}
                          values={dataset.rows.map((r) => r[selectedColumn])}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Correlation Matrix */}
            {activeTab === 'correlation' && (
              <div className="animate-in fade-in duration-150">
                <CorrelationMatrixView
                  rows={dataset.rows}
                  numericColumns={numericColumns}
                />
              </div>
            )}

            {/* Tab 4: Data Explorer */}
            {activeTab === 'grid' && (
              <div className="animate-in fade-in duration-150">
                <DataTable
                  rows={dataset.rows}
                  columns={dataset.columns}
                  columnTypes={dataset.columnTypes}
                />
              </div>
            )}
          </>
        )}

        {/* Empty state welcome card when no file is loaded */}
        {!dataset && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
              <div className="p-2.5 rounded-lg bg-blue-600/10 text-blue-400 w-fit mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">直觀缺失矩陣 (Missingno)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                自動將資料缺失樣態轉化為黑紅白條紋矩陣，一眼看穿感測器斷訊、週期性掉值或頭尾遺失規律。
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
              <div className="p-2.5 rounded-lg bg-indigo-600/10 text-indigo-400 w-fit mb-3">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">專業分布與箱線圖</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                直方圖、KDE 核密度曲線、五數概括與 IQR 異常離群值偵測，支援動態滑桿即時調節分箱數。
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
              <div className="p-2.5 rounded-lg bg-emerald-600/10 text-emerald-400 w-fit mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">離線免安裝與報告匯出</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                零安裝依賴、本地完全離線計算、支援繁體中文 Big5 自動解碼，一鍵產出自包含 HTML 診斷報告。
              </p>
            </div>
          </div>
        )}

        {/* Cleaning Modal */}
        {dataset && (
          <MissingCleanerModal
            isOpen={isCleanerOpen}
            onClose={() => setIsCleanerOpen(false)}
            dataset={dataset}
            onApply={(cleaned) => {
              setDataset(cleaned);
              setSelectedColumn(cleaned.columns[0] || '');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 px-6 text-center text-[11px] text-slate-500">
        NoneWeb Data Analyzer &copy; 2026 - 離線可攜式資料品質診斷工具
      </footer>
    </div>
  );
}

export default App;
