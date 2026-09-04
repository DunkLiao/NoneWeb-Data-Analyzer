import React, { useState, useMemo } from 'react';
import type { CorrelationMatrix } from '../../types/data';
import { calcPearsonCorrelation, getScatterData } from '../../utils/correlation';
import { EChartWrapper } from '../Common/EChartWrapper';
import { Network, TrendingUp, Info } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface CorrelationMatrixViewProps {
  rows: Record<string, any>[];
  numericColumns: string[];
}

export const CorrelationMatrixView: React.FC<CorrelationMatrixViewProps> = ({
  rows,
  numericColumns,
}) => {
  const [colX, setColX] = useState<string>(numericColumns[0] || '');
  const [colY, setColY] = useState<string>(numericColumns[1] || numericColumns[0] || '');

  const corr: CorrelationMatrix = useMemo(() => {
    return calcPearsonCorrelation(rows, numericColumns);
  }, [rows, numericColumns]);

  const scatterInfo = useMemo(() => {
    if (!colX || !colY) return { points: [] };
    return getScatterData(rows, colX, colY);
  }, [rows, colX, colY]);

  if (numericColumns.length < 2) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <Network className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-200">數值型欄位不足</h4>
        <p className="text-xs text-slate-400 mt-1">
          本資料集少於 2 個數值型欄位，無法進行雙變量與相關性分析。
        </p>
      </div>
    );
  }

  // Correlation Heatmap Option
  const heatmapData: [number, number, number][] = [];
  for (let i = 0; i < corr.columns.length; i++) {
    for (let j = 0; j < corr.columns.length; j++) {
      heatmapData.push([j, i, corr.matrix[i][j]]);
    }
  }

  const heatmapOption: EChartsOption = {
    tooltip: {
      position: 'top',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      formatter: (params: any) => {
        const [x, y, val] = params.value;
        const c1 = corr.columns[x];
        const c2 = corr.columns[y];
        return `
          <div style="font-weight:600;">${c1} ↔ ${c2}</div>
          <div style="margin-top:2px; color:#cbd5e1;">Pearson 相關係數: <strong style="color:${val > 0 ? '#10b981' : val < 0 ? '#f43f5e' : '#cbd5e1'}">${val}</strong></div>
        `;
      },
    },
    grid: {
      left: '12%',
      right: '8%',
      bottom: '18%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: corr.columns,
      axisLabel: { rotate: 35, color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'category',
      data: corr.columns,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#f43f5e', '#1e293b', '#10b981'], // Red (-1) -> Dark (0) -> Green (+1)
      },
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        name: '相關係數',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: corr.columns.length <= 12,
          color: '#f8fafc',
          fontSize: 10,
          formatter: (p: any) => p.value[2],
        },
        itemStyle: {
          borderColor: '#0f172a',
          borderWidth: 1,
        },
      },
    ],
  };

  // Scatter Plot Option
  const scatterPoints = scatterInfo.points;
  let trendlineSeries: any = null;

  if (scatterInfo.trendline && scatterPoints.length > 1) {
    const minX = Math.min(...scatterPoints.map((p) => p[0]));
    const maxX = Math.max(...scatterPoints.map((p) => p[0]));
    const { slope, intercept } = scatterInfo.trendline;

    trendlineSeries = {
      name: '線性趨勢線',
      type: 'line',
      showSymbol: false,
      data: [
        [minX, slope * minX + intercept],
        [maxX, slope * maxX + intercept],
      ],
      lineStyle: {
        color: '#f59e0b',
        width: 2.5,
        type: 'dashed',
      },
    };
  }

  const scatterOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      formatter: (p: any) => {
        if (p.seriesType === 'scatter') {
          return `(${colX}: ${p.value[0]}, ${colY}: ${p.value[1]})`;
        }
        return p.seriesName;
      },
    },
    grid: {
      left: '4%',
      right: '5%',
      bottom: '12%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: colX,
      nameLocation: 'middle',
      nameGap: 25,
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      name: colY,
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: '散布點',
        type: 'scatter',
        symbolSize: 6,
        data: scatterPoints,
        itemStyle: {
          color: 'rgba(56, 189, 248, 0.7)',
        },
      },
      ...(trendlineSeries ? [trendlineSeries] : []),
    ],
  };

  return (
    <div className="space-y-4">
      {/* Correlation Heatmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Network className="w-5 h-5 text-emerald-400" />
              數值欄位 Pearson 相關係數矩陣
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              衡量變量間線性相關程度：<strong className="text-emerald-400">+1.0 正相關</strong>、
              <strong className="text-red-400">-1.0 負相關</strong>、0 為不相關。
            </p>
          </div>
        </div>
        <EChartWrapper option={heatmapOption} height={360} />
      </div>

      {/* Bivariate Scatter Plot with Trendline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              雙變量散布圖 (Scatter Plot) 與趨勢線
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">觀察任意兩數值欄位的實體關聯型態與離群情況</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">X 軸:</span>
            <select
              value={colX}
              onChange={(e) => setColX(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {numericColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>

            <span className="text-slate-400 font-medium ml-2">Y 軸:</span>
            <select
              value={colY}
              onChange={(e) => setColY(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {numericColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        {scatterInfo.trendline && (
          <div className="mb-2 text-xs text-slate-400 flex items-center gap-2 bg-slate-950/60 py-1.5 px-3 rounded-lg border border-slate-800">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>
              回歸趨勢線方程式：
              <strong className="text-amber-300">
                y = {scatterInfo.trendline.slope}x {scatterInfo.trendline.intercept >= 0 ? '+' : ''}{' '}
                {scatterInfo.trendline.intercept}
              </strong>
            </span>
          </div>
        )}

        <EChartWrapper option={scatterOption} height={320} />
      </div>
    </div>
  );
};
