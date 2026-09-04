import type { CorrelationMatrix } from '../types/data';
import { isValueMissing } from './parser';

export function calcPearsonCorrelation(
  rows: Record<string, any>[],
  numericColumns: string[]
): CorrelationMatrix {
  const p = numericColumns.length;
  const matrix: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));

  for (let i = 0; i < p; i++) {
    const colA = numericColumns[i];
    for (let j = 0; j < p; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
        continue;
      }
      if (j < i) {
        matrix[i][j] = matrix[j][i];
        continue;
      }

      const colB = numericColumns[j];

      // Pairwise complete values
      const pairs: [number, number][] = [];
      rows.forEach((r) => {
        const valA = r[colA];
        const valB = r[colB];
        if (!isValueMissing(valA) && !isValueMissing(valB)) {
          const numA = Number(valA);
          const numB = Number(valB);
          if (!isNaN(numA) && !isNaN(numB) && isFinite(numA) && isFinite(numB)) {
            pairs.push([numA, numB]);
          }
        }
      });

      const n = pairs.length;
      if (n < 2) {
        matrix[i][j] = 0;
        continue;
      }

      let sumA = 0,
        sumB = 0,
        sumAB = 0,
        sumA2 = 0,
        sumB2 = 0;
      pairs.forEach(([a, b]) => {
        sumA += a;
        sumB += b;
        sumAB += a * b;
        sumA2 += a * a;
        sumB2 += b * b;
      });

      const num = n * sumAB - sumA * sumB;
      const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

      const r = den === 0 ? 0 : Number((num / den).toFixed(3));
      matrix[i][j] = r;
    }
  }

  return {
    columns: numericColumns,
    matrix,
  };
}

export function getScatterData(
  rows: Record<string, any>[],
  colX: string,
  colY: string,
  maxPoints: number = 1000
): { points: [number, number][]; trendline?: { slope: number; intercept: number; r2: number } } {
  const points: [number, number][] = [];

  rows.forEach((r) => {
    const vx = r[colX];
    const vy = r[colY];
    if (!isValueMissing(vx) && !isValueMissing(vy)) {
      const nx = Number(vx);
      const ny = Number(vy);
      if (!isNaN(nx) && !isNaN(ny) && isFinite(nx) && isFinite(ny)) {
        points.push([nx, ny]);
      }
    }
  });

  const n = points.length;
  if (n < 2) {
    return { points };
  }

  // Calculate simple linear regression trendline
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  points.forEach(([x, y]) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return { points: points.slice(0, maxPoints) };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Downsample points if too many for smooth chart
  const sampledPoints =
    n > maxPoints
      ? points.filter((_, idx) => idx % Math.ceil(n / maxPoints) === 0)
      : points;

  return {
    points: sampledPoints,
    trendline: {
      slope: Number(slope.toFixed(4)),
      intercept: Number(intercept.toFixed(4)),
      r2: 0,
    },
  };
}
