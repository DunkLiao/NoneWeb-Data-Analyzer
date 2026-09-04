export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'boolean';

export interface ColumnMissingStat {
  name: string;
  type: ColumnType;
  total: number;
  missingCount: number;
  missingRate: number; // 0 ~ 100 (%)
  validCount: number;
  uniqueCount: number;
}

export interface OverallMissingStat {
  totalRows: number;
  totalCols: number;
  totalCells: number;
  totalMissingCells: number;
  overallMissingRate: number; // 0 ~ 100 (%)
  completeRowsCount: number;
  completeRowsRate: number; // 0 ~ 100 (%)
  colsWithMissingCount: number;
}

export interface HistogramBin {
  min: number;
  max: number;
  label: string;
  count: number;
}

export interface QQPlotPoint {
  theoretical: number;
  sample: number;
}

export interface QQPlotData {
  points: [number, number][];
  line: [number, number][];
  slope: number;
  intercept: number;
  rSquared: number;
  normalityStatus: 'likely_normal' | 'moderate_deviation' | 'heavy_skewed';
}

export interface NumericStats {
  count: number;
  missing: number;
  mean: number;
  std: number;
  variance: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  outliersCount: number;
  outlierIndices: number[];
  histogram: HistogramBin[];
  kde: { x: number; y: number }[];
  cdf: { x: number; y: number }[];
  qqPlot?: QQPlotData;
}

export interface CategoryFrequency {
  value: string;
  count: number;
  percentage: number;
}

export interface ParetoItem {
  value: string;
  count: number;
  percentage: number;
  cumCount: number;
  cumPercentage: number;
}

export interface CategoricalStats {
  count: number;
  missing: number;
  uniqueCount: number;
  mode: string;
  modeCount: number;
  frequencies: CategoryFrequency[];
  pareto: ParetoItem[];
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][]; // values -1 to 1
}

export interface NullityMatrixData {
  columns: string[];
  sampleRows: number; // how many rows sampled if dataset is huge
  matrix: boolean[][]; // [row][col] is true if missing
}

export interface RadarMetric {
  name: string;
  max: number;
}

export interface RadarSeriesItem {
  name: string;
  value: number[];
}

export interface RadarData {
  indicators: { name: string; max: number }[];
  series: { name: string; value: number[] }[];
}

export interface ParsedDataset {
  filename: string;
  fileSize: number;
  encoding: string;
  delimiter?: string;
  sheetNames?: string[];
  activeSheet?: string;
  columns: string[];
  columnTypes: Record<string, ColumnType>;
  rows: Record<string, any>[];
}

export type ActiveTab = 'missing' | 'distribution' | 'correlation' | 'grid';
