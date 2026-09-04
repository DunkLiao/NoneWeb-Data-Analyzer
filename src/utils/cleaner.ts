import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ColumnType, ParsedDataset } from '../types/data';
import { isValueMissing } from './parser';
import { calcNumericStats, calcCategoricalStats } from './statistics';
import { invoke, isTauri } from '@tauri-apps/api/core';

export interface CleaningOptions {
  dropRowsWithMissing: boolean;
  dropColThreshold: number; // 0 to 100 (percentage)
  imputeNumeric: 'none' | 'mean' | 'median' | 'zero';
  imputeCategorical: 'none' | 'mode' | 'constant';
  customConstantText?: string;
}

export function cleanDataset(
  dataset: ParsedDataset,
  options: CleaningOptions
): ParsedDataset {
  let { rows, columns, columnTypes } = dataset;

  // 1. Drop columns exceeding missing threshold
  if (options.dropColThreshold < 100) {
    const totalRows = rows.length;
    columns = columns.filter((col) => {
      let missingCount = 0;
      rows.forEach((r) => {
        if (isValueMissing(r[col])) missingCount++;
      });
      const rate = (missingCount / totalRows) * 100;
      return rate <= options.dropColThreshold;
    });
  }

  // 2. Drop rows with missing values
  if (options.dropRowsWithMissing) {
    rows = rows.filter((r) => {
      return columns.every((col) => !isValueMissing(r[col]));
    });
  }

  // 3. Imputation
  if (
    options.imputeNumeric !== 'none' ||
    options.imputeCategorical !== 'none'
  ) {
    // Pre-calculate imputation values for each column
    const colImputeValue: Record<string, any> = {};

    columns.forEach((col) => {
      const type = columnTypes[col];
      const colValues = rows.map((r) => r[col]);

      if (type === 'numeric' && options.imputeNumeric !== 'none') {
        const stats = calcNumericStats(colValues);
        if (options.imputeNumeric === 'mean') {
          colImputeValue[col] = stats.mean;
        } else if (options.imputeNumeric === 'median') {
          colImputeValue[col] = stats.median;
        } else if (options.imputeNumeric === 'zero') {
          colImputeValue[col] = 0;
        }
      } else if (type !== 'numeric' && options.imputeCategorical !== 'none') {
        const stats = calcCategoricalStats(colValues);
        if (options.imputeCategorical === 'mode') {
          colImputeValue[col] = stats.mode === '-' ? 'Unknown' : stats.mode;
        } else if (options.imputeCategorical === 'constant') {
          colImputeValue[col] = options.customConstantText || '缺失值';
        }
      }
    });

    // Apply imputation
    rows = rows.map((r) => {
      const newRow = { ...r };
      columns.forEach((col) => {
        if (isValueMissing(newRow[col]) && colImputeValue[col] !== undefined) {
          newRow[col] = colImputeValue[col];
        }
      });
      return newRow;
    });
  }

  return {
    ...dataset,
    filename: dataset.filename.replace(/\.(csv|xlsx|xls|tsv)$/i, '_cleaned.$1'),
    columns,
    columnTypes: Object.fromEntries(
      Object.entries(columnTypes).filter(([col]) => columns.includes(col))
    ) as Record<string, ColumnType>,
    rows,
  };
}

export async function saveFileWithDialog(
  suggestedName: string,
  content: string | Uint8Array | Blob,
  isBase64 = false
): Promise<boolean> {
  const inTauri = typeof window !== 'undefined' && isTauri();

  if (inTauri) {
    try {
      let payloadContent = '';
      let isBinaryPayload = isBase64;

      if (content instanceof Blob) {
        const buffer = await content.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        payloadContent = btoa(binary);
        isBinaryPayload = true;
      } else if (content instanceof Uint8Array) {
        let binary = '';
        for (let i = 0; i < content.byteLength; i++) {
          binary += String.fromCharCode(content[i]);
        }
        payloadContent = btoa(binary);
        isBinaryPayload = true;
      } else {
        payloadContent = content;
      }

      const savedPath = await invoke<string | null>('save_file_dialog', {
        suggestedName,
        content: payloadContent,
        isBase64: isBinaryPayload,
      });

      if (savedPath) {
        alert(`檔案已成功儲存至：\n${savedPath}`);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Tauri save_file_dialog error, falling back:', err);
    }
  }

  // Browser fallback
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof Uint8Array) {
    blob = new Blob([content as any]);
  } else {
    blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export function downloadFile(blob: Blob, filename: string) {
  saveFileWithDialog(filename, blob);
}

export async function exportToCsv(rows: Record<string, any>[], columns: string[], filename: string) {
  const csv = Papa.unparse({
    fields: columns,
    data: rows.map((r) => columns.map((c) => (r[c] === null || r[c] === undefined ? '' : r[c]))),
  });

  const bom = '\uFEFF';
  const csvContent = bom + csv;
  const targetName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  await saveFileWithDialog(targetName, csvContent, false);
}

export async function exportToExcel(rows: Record<string, any>[], columns: string[], filename: string) {
  const data = rows.map((r) => {
    const rowObj: Record<string, any> = {};
    columns.forEach((col) => {
      rowObj[col] = r[col];
    });
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(data, { header: columns });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const targetName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  await saveFileWithDialog(targetName, wbout, true);
}
