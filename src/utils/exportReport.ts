import type { NumericStats, CategoricalStats, ParsedDataset } from '../types/data';
import { calcOverallMissing, calcColumnMissingStats } from './missingAnalysis';
import { calcNumericStats, calcCategoricalStats } from './statistics';
import { saveFileWithDialog } from './cleaner';

export async function exportHtmlReport(dataset: ParsedDataset) {
  const overall = calcOverallMissing(dataset.rows, dataset.columns);
  const colStats = calcColumnMissingStats(dataset.rows, dataset.columns, dataset.columnTypes);

  // Compute stats for all columns
  const numericSummaries: { name: string; stats: NumericStats }[] = [];
  const categoricalSummaries: { name: string; stats: CategoricalStats }[] = [];

  dataset.columns.forEach((col) => {
    const vals = dataset.rows.map((r) => r[col]);
    if (dataset.columnTypes[col] === 'numeric') {
      numericSummaries.push({ name: col, stats: calcNumericStats(vals) });
    } else {
      categoricalSummaries.push({ name: col, stats: calcCategoricalStats(vals) });
    }
  });

  const nowStr = new Date().toLocaleString();

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>資料缺失值與分布分析診斷報告 - ${dataset.filename}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 30px;
      background-color: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
    }
    h1 {
      color: #0f172a;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 12px;
      margin-top: 0;
    }
    h2 {
      color: #1e293b;
      margin-top: 32px;
      padding-left: 10px;
      border-left: 4px solid #3b82f6;
    }
    .meta-box {
      background: #f1f5f9;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 14px;
    }
    .meta-item {
      font-weight: 500;
    }
    .meta-item span {
      color: #2563eb;
      font-weight: 600;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .metric-title {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #0f172a;
    }
    .metric-badge {
      font-size: 12px;
      color: #2563eb;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      margin-bottom: 24px;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-numeric { background: #dbeafe; color: #1e40af; }
    .badge-cat { background: #fef3c7; color: #92400e; }
    .progress-bar-bg {
      background: #e2e8f0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      width: 100%;
    }
    .progress-bar-fill {
      background: #ef4444;
      height: 100%;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .container { box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>資料診斷與分布分析報告</h1>
    
    <div class="meta-box">
      <div class="meta-item">檔案名稱：<span>${dataset.filename}</span></div>
      <div class="meta-item">資料維度：<span>${dataset.rows.length.toLocaleString()} 列 × ${dataset.columns.length} 欄</span></div>
      <div class="meta-item">編碼：<span>${dataset.encoding}</span></div>
      <div class="meta-item">報告產生時間：<span>${nowStr}</span></div>
    </div>

    <h2>1. 缺失值整體概況</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">總儲存格數</div>
        <div class="metric-value">${overall.totalCells.toLocaleString()}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">總缺失值數</div>
        <div class="metric-value" style="color: ${overall.totalMissingCells > 0 ? '#ef4444' : '#10b981'}">
          ${overall.totalMissingCells.toLocaleString()}
        </div>
        <div class="metric-badge">佔整體 ${overall.overallMissingRate}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">完整列數 (無缺失)</div>
        <div class="metric-value">${overall.completeRowsCount.toLocaleString()}</div>
        <div class="metric-badge">佔比 ${overall.completeRowsRate}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">含有缺值的欄位數</div>
        <div class="metric-value">${overall.colsWithMissingCount} / ${overall.totalCols}</div>
      </div>
    </div>

    <h2>2. 各欄位缺失值統計清單</h2>
    <table>
      <thead>
        <tr>
          <th>欄位名稱</th>
          <th>資料型態</th>
          <th>總筆數</th>
          <th>有效值數</th>
          <th>缺失筆數</th>
          <th>缺失率</th>
          <th>視覺進度</th>
        </tr>
      </thead>
      <tbody>
        ${colStats
          .map(
            (c) => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td><span class="badge ${c.type === 'numeric' ? 'badge-numeric' : 'badge-cat'}">${c.type}</span></td>
            <td>${c.total.toLocaleString()}</td>
            <td>${c.validCount.toLocaleString()}</td>
            <td style="${c.missingCount > 0 ? 'color: #ef4444; font-weight:600;' : ''}">${c.missingCount.toLocaleString()}</td>
            <td>${c.missingRate}%</td>
            <td style="width: 160px;">
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${c.missingRate}%;"></div>
              </div>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <h2>3. 數值型變量分布統計 (Numerical Columns)</h2>
    <table>
      <thead>
        <tr>
          <th>欄位</th>
          <th>樣本數</th>
          <th>平均值</th>
          <th>標準差</th>
          <th>中位數</th>
          <th>最小值</th>
          <th>Q1 (25%)</th>
          <th>Q3 (75%)</th>
          <th>最大值</th>
          <th>偏態 (Skew)</th>
          <th>異常值 (Outliers)</th>
        </tr>
      </thead>
      <tbody>
        ${numericSummaries
          .map(
            (item) => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.stats.count.toLocaleString()}</td>
            <td>${item.stats.mean}</td>
            <td>${item.stats.std}</td>
            <td>${item.stats.median}</td>
            <td>${item.stats.min}</td>
            <td>${item.stats.q1}</td>
            <td>${item.stats.q3}</td>
            <td>${item.stats.max}</td>
            <td>${item.stats.skewness}</td>
            <td><strong style="${item.stats.outliersCount > 0 ? 'color: #f59e0b;' : ''}">${item.stats.outliersCount} 筆</strong></td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <h2>4. 類別型變量分布概況 (Categorical Columns)</h2>
    <table>
      <thead>
        <tr>
          <th>欄位</th>
          <th>有效筆數</th>
          <th>唯一值種類數</th>
          <th>眾數 (Mode)</th>
          <th>眾數出現次數</th>
          <th>前 3 名常見類別及比例</th>
        </tr>
      </thead>
      <tbody>
        ${categoricalSummaries
          .map(
            (item) => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.stats.count.toLocaleString()}</td>
            <td>${item.stats.uniqueCount} 種</td>
            <td><span class="badge badge-cat">${item.stats.mode}</span></td>
            <td>${item.stats.modeCount.toLocaleString()}</td>
            <td>
              ${item.stats.frequencies
                .slice(0, 3)
                .map((f) => `${f.value} (${f.percentage}%)`)
                .join(', ') || '-'}
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  await saveFileWithDialog(`${dataset.filename}_診斷分析報告.html`, html, false);
}
