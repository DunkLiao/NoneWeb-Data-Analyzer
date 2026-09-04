import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jschardet from 'jschardet';
import type { ColumnType, ParsedDataset } from '../types/data';

export const COMMON_ENCODINGS = [
  { label: 'UTF-8', value: 'UTF-8' },
  { label: 'Big5 (繁體中文)', value: 'Big5' },
  { label: 'GB18030 / GBK (簡體中文)', value: 'GB18030' },
  { label: 'Shift-JIS (日文)', value: 'Shift-JIS' },
  { label: 'Windows-1252 (Western European)', value: 'windows-1252' },
];

export function isValueMissing(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'number') return isNaN(val);
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    return (
      trimmed === '' ||
      trimmed === 'nan' ||
      trimmed === 'null' ||
      trimmed === 'none' ||
      trimmed === 'n/a' ||
      trimmed === 'na' ||
      trimmed === '-' ||
      trimmed === 'nil' ||
      trimmed === 'undefined'
    );
  }
  return false;
}

export function inferColumnType(values: any[]): ColumnType {
  let validCount = 0;
  let numericCount = 0;
  let booleanCount = 0;
  let dateCount = 0;

  // Check up to first 500 valid values for speed and accuracy
  for (let i = 0; i < values.length && validCount < 500; i++) {
    const v = values[i];
    if (isValueMissing(v)) continue;

    validCount++;
    const str = String(v).trim().toLowerCase();

    if (str === 'true' || str === 'false' || str === '0' || str === '1') {
      if (str === 'true' || str === 'false') {
        booleanCount++;
      }
    }

    if (typeof v === 'number') {
      numericCount++;
      continue;
    }

    // Check if valid number
    if (!isNaN(Number(str)) && str !== '') {
      numericCount++;
      continue;
    }

    // Check if ISO / formatted date
    if (str.length >= 8 && (str.includes('-') || str.includes('/') || str.includes(':'))) {
      const parsedDate = Date.parse(str);
      if (!isNaN(parsedDate)) {
        dateCount++;
      }
    }
  }

  if (validCount === 0) return 'categorical';
  if (numericCount / validCount >= 0.8) return 'numeric';
  if (booleanCount / validCount >= 0.8) return 'boolean';
  if (dateCount / validCount >= 0.8) return 'datetime';
  return 'categorical';
}

export async function detectEncoding(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    // Read first 64KB for detection
    const blob = file.slice(0, 65536);
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let binaryStr = '';
        for (let i = 0; i < bytes.length; i++) {
          binaryStr += String.fromCharCode(bytes[i]);
        }
        const detected = jschardet.detect(binaryStr);
        if (detected && detected.encoding) {
          const enc = detected.encoding.toUpperCase();
          if (enc.includes('BIG5') || enc.includes('CP950')) return resolve('Big5');
          if (enc.includes('GB2312') || enc.includes('GBK') || enc.includes('GB18030')) return resolve('GB18030');
          if (enc.includes('SHIFT_JIS') || enc.includes('SJIS')) return resolve('Shift-JIS');
          if (enc.includes('UTF-8')) return resolve('UTF-8');
          if (enc.includes('ASCII')) return resolve('UTF-8');
        }
      } catch (err) {
        console.warn('Encoding detection error:', err);
      }
      resolve('UTF-8');
    };
    reader.onerror = () => resolve('UTF-8');
    reader.readAsArrayBuffer(blob);
  });
}

export async function parseFile(
  file: File,
  forcedEncoding?: string,
  selectedSheet?: string
): Promise<ParsedDataset> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  if (isExcel) {
    return parseExcelFile(file, selectedSheet);
  } else {
    const encoding = forcedEncoding || (await detectEncoding(file));
    return parseCsvFile(file, encoding);
  }
}

async function parseCsvFile(file: File, encoding: string): Promise<ParsedDataset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            reject(new Error('檔案內容為空或無法讀取'));
            return;
          }

          const rawRows = results.data as Record<string, any>[];
          const columns = results.meta.fields || (rawRows[0] ? Object.keys(rawRows[0]) : []);

          // Clean empty column headers
          const validColumns = columns.filter((col) => col && col.trim().length > 0);

          // Infer types for each column
          const columnTypes: Record<string, ColumnType> = {};
          validColumns.forEach((col) => {
            const values = rawRows.map((r) => r[col]);
            columnTypes[col] = inferColumnType(values);
          });

          // Convert numeric columns consistently
          const sanitizedRows = rawRows.map((row) => {
            const newRow: Record<string, any> = {};
            validColumns.forEach((col) => {
              const val = row[col];
              if (isValueMissing(val)) {
                newRow[col] = null;
              } else if (columnTypes[col] === 'numeric') {
                const num = Number(val);
                newRow[col] = isNaN(num) ? null : num;
              } else {
                newRow[col] = String(val);
              }
            });
            return newRow;
          });

          resolve({
            filename: file.name,
            fileSize: file.size,
            encoding,
            delimiter: results.meta.delimiter,
            columns: validColumns,
            columnTypes,
            rows: sanitizedRows,
          });
        },
        error: (err: any) => reject(err),
      });
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file, encoding);
  });
}

async function parseExcelFile(file: File, targetSheet?: string): Promise<ParsedDataset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        if (sheetNames.length === 0) {
          reject(new Error('Excel 檔案內無任何工作表'));
          return;
        }

        const activeSheet = targetSheet && sheetNames.includes(targetSheet) ? targetSheet : sheetNames[0];
        const worksheet = workbook.Sheets[activeSheet];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null });

        if (jsonData.length === 0) {
          reject(new Error(`工作表 [${activeSheet}] 沒有資料`));
          return;
        }

        const columns = Object.keys(jsonData[0]);
        const validColumns = columns.filter((col) => col && col.trim().length > 0);

        const columnTypes: Record<string, ColumnType> = {};
        validColumns.forEach((col) => {
          const values = jsonData.map((r) => r[col]);
          columnTypes[col] = inferColumnType(values);
        });

        const sanitizedRows = jsonData.map((row) => {
          const newRow: Record<string, any> = {};
          validColumns.forEach((col) => {
            const val = row[col];
            if (isValueMissing(val)) {
              newRow[col] = null;
            } else if (columnTypes[col] === 'numeric') {
              const num = Number(val);
              newRow[col] = isNaN(num) ? null : num;
            } else {
              newRow[col] = String(val);
            }
          });
          return newRow;
        });

        resolve({
          filename: file.name,
          fileSize: file.size,
          encoding: 'Binary / Excel',
          sheetNames,
          activeSheet,
          columns: validColumns,
          columnTypes,
          rows: sanitizedRows,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('無法讀取 Excel 檔案'));
    reader.readAsArrayBuffer(file);
  });
}
