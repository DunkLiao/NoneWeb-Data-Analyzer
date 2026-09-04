import type {
  CategoricalStats,
  HistogramBin,
  NumericStats,
  ParetoItem,
  QQPlotData,
  RadarData,
} from '../types/data';
import { isValueMissing } from './parser';

/**
 * Standard Normal Inverse Cumulative Distribution Function (Acklam's Approximation)
 * Accurate to < 1.15e-9
 */
export function normInv(p: number): number {
  if (p <= 0) return -8;
  if (p >= 1) return 8;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

export function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function calcQQPlot(sorted: number[], q1: number, q3: number, skewness: number): QQPlotData {
  const n = sorted.length;
  if (n < 3) {
    return {
      points: [],
      line: [],
      slope: 1,
      intercept: 0,
      rSquared: 1,
      normalityStatus: 'likely_normal',
    };
  }

  // Calculate theoretical line based on IQR (R qqline approach)
  const zQ1 = -0.67448975;
  const zQ3 = 0.67448975;
  const iqr = q3 - q1;
  const slope = iqr > 0 ? iqr / (zQ3 - zQ1) : 1;
  const intercept = q1 - slope * zQ1;

  // Sample points (downsample uniformly to at most 300 points for smooth rendering)
  const maxPoints = 300;
  const points: [number, number][] = [];
  const step = n > maxPoints ? Math.floor(n / maxPoints) : 1;

  let ssTot = 0;
  let ssRes = 0;
  const meanY = sorted.reduce((a, b) => a + b, 0) / n;

  for (let i = 0; i < n; i += step) {
    const p = (i + 0.5) / n;
    const z = normInv(p);
    const y = sorted[i];
    points.push([Number(z.toFixed(3)), Number(y.toFixed(3))]);

    const yPred = slope * z + intercept;
    ssRes += Math.pow(y - yPred, 2);
    ssTot += Math.pow(y - meanY, 2);
  }

  const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;

  const minZ = points[0][0];
  const maxZ = points[points.length - 1][0];
  const line: [number, number][] = [
    [Number(minZ.toFixed(3)), Number((slope * minZ + intercept).toFixed(3))],
    [Number(maxZ.toFixed(3)), Number((slope * maxZ + intercept).toFixed(3))],
  ];

  let normalityStatus: QQPlotData['normalityStatus'] = 'likely_normal';
  if (rSquared < 0.88 || Math.abs(skewness) > 1.2) {
    normalityStatus = 'heavy_skewed';
  } else if (rSquared < 0.95 || Math.abs(skewness) > 0.5) {
    normalityStatus = 'moderate_deviation';
  }

  return {
    points,
    line,
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    normalityStatus,
  };
}

export function calcNumericStats(values: any[], binCount: number = 25): NumericStats {
  const nums: number[] = [];
  const outlierIndices: number[] = [];
  let missing = 0;

  values.forEach((v) => {
    if (isValueMissing(v)) {
      missing++;
    } else {
      const num = Number(v);
      if (!isNaN(num) && isFinite(num)) {
        nums.push(num);
      } else {
        missing++;
      }
    }
  });

  const n = nums.length;
  if (n === 0) {
    return {
      count: 0,
      missing,
      mean: 0,
      std: 0,
      variance: 0,
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      iqr: 0,
      skewness: 0,
      kurtosis: 0,
      outliersCount: 0,
      outlierIndices: [],
      histogram: [],
      kde: [],
      cdf: [],
    };
  }

  const sorted = [...nums].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, cur) => acc + cur, 0);
  const mean = sum / n;

  const min = sorted[0];
  const max = sorted[n - 1];
  const median = getPercentile(sorted, 0.5);
  const q1 = getPercentile(sorted, 0.25);
  const q3 = getPercentile(sorted, 0.75);
  const iqr = q3 - q1;

  // Variance & Std
  const variance = n > 1 ? sorted.reduce((acc, cur) => acc + Math.pow(cur - mean, 2), 0) / (n - 1) : 0;
  const std = Math.sqrt(variance);

  // Outliers (1.5 * IQR)
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  values.forEach((v, idx) => {
    if (!isValueMissing(v)) {
      const num = Number(v);
      if (num < lowerBound || num > upperBound) {
        outlierIndices.push(idx);
      }
    }
  });

  // Skewness and Kurtosis
  let skewness = 0;
  let kurtosis = 0;
  if (n > 2 && std > 0) {
    const m3 = sorted.reduce((acc, cur) => acc + Math.pow((cur - mean) / std, 3), 0);
    skewness = (n / ((n - 1) * (n - 2))) * m3;
  }
  if (n > 3 && std > 0) {
    const m4 = sorted.reduce((acc, cur) => acc + Math.pow((cur - mean) / std, 4), 0);
    kurtosis =
      ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 -
      (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  // Histogram Bins
  const bins: HistogramBin[] = [];
  const actualBinCount = Math.max(5, Math.min(100, binCount));
  const range = max - min;
  const binWidth = range === 0 ? 1 : range / actualBinCount;

  for (let i = 0; i < actualBinCount; i++) {
    const bMin = min + i * binWidth;
    const bMax = min + (i + 1) * binWidth;
    bins.push({
      min: bMin,
      max: bMax,
      label: `${bMin.toFixed(2)} ~ ${bMax.toFixed(2)}`,
      count: 0,
    });
  }

  sorted.forEach((val) => {
    let bIdx = range === 0 ? 0 : Math.floor((val - min) / binWidth);
    if (bIdx >= actualBinCount) bIdx = actualBinCount - 1;
    if (bIdx < 0) bIdx = 0;
    bins[bIdx].count++;
  });

  // KDE (Kernel Density Estimation)
  const kde: { x: number; y: number }[] = [];
  const bandwidth = std > 0 ? 1.06 * std * Math.pow(n, -0.2) : 1;
  const kdePoints = 60;
  const step = range === 0 ? 1 : range / (kdePoints - 1);

  for (let i = 0; i < kdePoints; i++) {
    const x = min + i * step;
    let density = 0;
    if (bandwidth > 0 && n > 0) {
      for (let j = 0; j < n; j++) {
        const u = (x - sorted[j]) / bandwidth;
        density += Math.exp(-0.5 * u * u) / (Math.sqrt(2 * Math.PI) * bandwidth);
      }
      density = density / n;
    }
    const scaledCount = density * (n * binWidth);
    kde.push({
      x: Number(x.toFixed(3)),
      y: Number(scaledCount.toFixed(3)),
    });
  }

  // CDF (Cumulative Distribution Function)
  const cdf: { x: number; y: number }[] = [];
  const cdfSteps = Math.min(100, n);
  for (let i = 0; i < cdfSteps; i++) {
    const idx = Math.floor((i / (cdfSteps - 1)) * (n - 1));
    cdf.push({
      x: Number(sorted[idx].toFixed(3)),
      y: Number((((idx + 1) / n) * 100).toFixed(2)),
    });
  }

  // Q-Q Plot
  const qqPlot = calcQQPlot(sorted, q1, q3, skewness);

  return {
    count: n,
    missing,
    mean: Number(mean.toFixed(4)),
    std: Number(std.toFixed(4)),
    variance: Number(variance.toFixed(4)),
    min: Number(min.toFixed(4)),
    q1: Number(q1.toFixed(4)),
    median: Number(median.toFixed(4)),
    q3: Number(q3.toFixed(4)),
    max: Number(max.toFixed(4)),
    iqr: Number(iqr.toFixed(4)),
    skewness: Number(skewness.toFixed(4)),
    kurtosis: Number(kurtosis.toFixed(4)),
    outliersCount: outlierIndices.length,
    outlierIndices,
    histogram: bins,
    kde,
    cdf,
    qqPlot,
  };
}

export function calcCategoricalStats(values: any[]): CategoricalStats {
  const map = new Map<string, number>();
  let validCount = 0;
  let missing = 0;

  values.forEach((v) => {
    if (isValueMissing(v)) {
      missing++;
    } else {
      validCount++;
      const str = String(v).trim();
      map.set(str, (map.get(str) || 0) + 1);
    }
  });

  const frequencies: { value: string; count: number; percentage: number }[] = [];
  let mode = '-';
  let modeCount = 0;

  map.forEach((count, val) => {
    if (count > modeCount) {
      modeCount = count;
      mode = val;
    }
    frequencies.push({
      value: val,
      count,
      percentage: validCount > 0 ? Number(((count / validCount) * 100).toFixed(2)) : 0,
    });
  });

  // Sort by count descending
  frequencies.sort((a, b) => b.count - a.count);

  // Calculate Pareto Cumulative Statistics
  let cumCount = 0;
  const pareto: ParetoItem[] = frequencies.map((f) => {
    cumCount += f.count;
    const cumPercentage = validCount > 0 ? Number(((cumCount / validCount) * 100).toFixed(2)) : 0;
    return {
      value: f.value,
      count: f.count,
      percentage: f.percentage,
      cumCount,
      cumPercentage,
    };
  });

  return {
    count: validCount,
    missing,
    uniqueCount: map.size,
    mode,
    modeCount,
    frequencies,
    pareto,
  };
}

/**
 * Calculates normalized radar profile metrics for chosen numeric columns.
 * Dimensions:
 * 1. 均值水平 (Mean Level)
 * 2. 變異係數 (CV = std/mean)
 * 3. 中位數強度 (Median Level)
 * 4. 展距 (IQR Spread)
 * 5. 異常值占比 (Outlier Rate)
 */
export function calcFeatureRadarData(
  rows: Record<string, any>[],
  selectedColumns: string[]
): RadarData {
  if (selectedColumns.length === 0) {
    return { indicators: [], series: [] };
  }

  const rawStats = selectedColumns.map((col) => {
    const values = rows.map((r) => r[col]);
    const stat = calcNumericStats(values);
    const cv = stat.mean !== 0 ? Math.abs(stat.std / stat.mean) : 0;
    const outlierRate = stat.count > 0 ? (stat.outliersCount / stat.count) * 100 : 0;
    const skewAbs = Math.min(3, Math.abs(stat.skewness));
    return {
      name: col,
      mean: stat.mean,
      cv,
      median: stat.median,
      iqr: stat.iqr,
      outlierRate,
      skewAbs,
    };
  });

  // Normalize each metric across chosen columns to 0-100 scale for radar comparison
  const getMinMax = (extractor: (s: (typeof rawStats)[0]) => number) => {
    const vals = rawStats.map(extractor);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { min, max: max === min ? min + 1 : max };
  };

  const meanMM = getMinMax((s) => s.mean);
  const cvMM = getMinMax((s) => s.cv);
  const medianMM = getMinMax((s) => s.median);
  const iqrMM = getMinMax((s) => s.iqr);
  const outlierMM = getMinMax((s) => s.outlierRate);

  const normalize = (val: number, mm: { min: number; max: number }) => {
    const norm = ((val - mm.min) / (mm.max - mm.min)) * 80 + 20; // 20~100 score for aesthetic radar
    return Number(norm.toFixed(1));
  };

  const indicators = [
    { name: '相對均值水準', max: 100 },
    { name: '離散度 (CV)', max: 100 },
    { name: '中位數水準', max: 100 },
    { name: '四分位展距 (IQR)', max: 100 },
    { name: '異常值比率 (%)', max: 100 },
  ];

  const series = rawStats.map((s) => ({
    name: s.name,
    value: [
      normalize(s.mean, meanMM),
      normalize(s.cv, cvMM),
      normalize(s.median, medianMM),
      normalize(s.iqr, iqrMM),
      normalize(s.outlierRate, outlierMM),
    ],
  }));

  return { indicators, series };
}
