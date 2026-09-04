import type {
  ColumnMissingStat,
  ColumnType,
  CorrelationMatrix,
  NullityMatrixData,
  OverallMissingStat,
} from '../types/data';
import { isValueMissing } from './parser';

export function calcOverallMissing(
  rows: Record<string, any>[],
  columns: string[]
): OverallMissingStat {
  const totalRows = rows.length;
  const totalCols = columns.length;
  const totalCells = totalRows * totalCols;

  if (totalCells === 0) {
    return {
      totalRows: 0,
      totalCols: 0,
      totalCells: 0,
      totalMissingCells: 0,
      overallMissingRate: 0,
      completeRowsCount: 0,
      completeRowsRate: 0,
      colsWithMissingCount: 0,
    };
  }

  let totalMissingCells = 0;
  let completeRowsCount = 0;
  const colMissingCounts = new Array(totalCols).fill(0);

  rows.forEach((row) => {
    let rowHasMissing = false;
    columns.forEach((col, colIdx) => {
      if (isValueMissing(row[col])) {
        totalMissingCells++;
        colMissingCounts[colIdx]++;
        rowHasMissing = true;
      }
    });
    if (!rowHasMissing) {
      completeRowsCount++;
    }
  });

  const colsWithMissingCount = colMissingCounts.filter((c) => c > 0).length;
  const overallMissingRate = Number(((totalMissingCells / totalCells) * 100).toFixed(2));
  const completeRowsRate = Number(((completeRowsCount / totalRows) * 100).toFixed(2));

  return {
    totalRows,
    totalCols,
    totalCells,
    totalMissingCells,
    overallMissingRate,
    completeRowsCount,
    completeRowsRate,
    colsWithMissingCount,
  };
}

export function calcColumnMissingStats(
  rows: Record<string, any>[],
  columns: string[],
  columnTypes: Record<string, ColumnType>
): ColumnMissingStat[] {
  const totalRows = rows.length;

  const stats: ColumnMissingStat[] = columns.map((col) => {
    let missingCount = 0;
    const uniqueValues = new Set<any>();

    rows.forEach((row) => {
      const val = row[col];
      if (isValueMissing(val)) {
        missingCount++;
      } else {
        uniqueValues.add(val);
      }
    });

    const validCount = totalRows - missingCount;
    const missingRate = totalRows > 0 ? Number(((missingCount / totalRows) * 100).toFixed(2)) : 0;

    return {
      name: col,
      type: columnTypes[col] || 'categorical',
      total: totalRows,
      missingCount,
      missingRate,
      validCount,
      uniqueCount: uniqueValues.size,
    };
  });

  // Sort descending by missingRate, then missingCount
  return stats.sort((a, b) => b.missingRate - a.missingRate);
}

export function generateNullityMatrix(
  rows: Record<string, any>[],
  columns: string[],
  maxSampleRows: number = 800
): NullityMatrixData {
  const totalRows = rows.length;
  if (totalRows === 0) {
    return { columns, sampleRows: 0, matrix: [] };
  }

  const sampleCount = Math.min(totalRows, maxSampleRows);
  const step = totalRows / sampleCount;
  const matrix: boolean[][] = [];

  for (let i = 0; i < sampleCount; i++) {
    const rowIdx = Math.min(Math.floor(i * step), totalRows - 1);
    const row = rows[rowIdx];
    const rowMissing = columns.map((col) => isValueMissing(row[col]));
    matrix.push(rowMissing);
  }

  return {
    columns,
    sampleRows: sampleCount,
    matrix,
  };
}

export function calcNullityCorrelation(
  rows: Record<string, any>[],
  columns: string[]
): CorrelationMatrix {
  // Only include columns that have at least one missing value and are not 100% missing
  const filteredCols: string[] = [];
  const binaryVectors: Map<string, number[]> = new Map();

  columns.forEach((col) => {
    let missingCount = 0;
    const vec: number[] = [];
    rows.forEach((row) => {
      const isMissing = isValueMissing(row[col]) ? 1 : 0;
      if (isMissing === 1) missingCount++;
      vec.push(isMissing);
    });

    if (missingCount > 0 && missingCount < rows.length) {
      filteredCols.push(col);
      binaryVectors.set(col, vec);
    }
  });

  const p = filteredCols.length;
  const matrix: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));

  for (let i = 0; i < p; i++) {
    const colA = filteredCols[i];
    const vecA = binaryVectors.get(colA)!;

    for (let j = 0; j < p; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
        continue;
      }
      if (j < i) {
        matrix[i][j] = matrix[j][i];
        continue;
      }

      const colB = filteredCols[j];
      const vecB = binaryVectors.get(colB)!;

      // Pearson correlation on binary variables (phi coefficient)
      let sumA = 0,
        sumB = 0,
        sumAB = 0,
        sumA2 = 0,
        sumB2 = 0;
      const n = vecA.length;

      for (let k = 0; k < n; k++) {
        const a = vecA[k];
        const b = vecB[k];
        sumA += a;
        sumB += b;
        sumAB += a * b;
        sumA2 += a * a;
        sumB2 += b * b;
      }

      const numerator = n * sumAB - sumA * sumB;
      const denom = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

      const r = denom === 0 ? 0 : Number((numerator / denom).toFixed(3));
      matrix[i][j] = r;
    }
  }

  return {
    columns: filteredCols,
    matrix,
  };
}
