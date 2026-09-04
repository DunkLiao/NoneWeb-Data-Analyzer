import type { CategoricalStats, HistogramBin, NumericStats } from '../types/data';
import { isValueMissing } from './parser';

export function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
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
        // Standard Gaussian kernel
        density += Math.exp(-0.5 * u * u) / (Math.sqrt(2 * Math.PI) * bandwidth);
      }
      density = density / n;
    }
    // Scale density to approximate histogram counts for visualization
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
      y: Number(((idx + 1) / n * 100).toFixed(2)),
    });
  }

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

  return {
    count: validCount,
    missing,
    uniqueCount: map.size,
    mode,
    modeCount,
    frequencies,
  };
}
