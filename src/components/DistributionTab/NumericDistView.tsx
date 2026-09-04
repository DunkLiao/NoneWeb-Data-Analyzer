import React, { useState } from 'react';
import type { NumericStats } from '../../types/data';
import { EChartWrapper } from '../Common/EChartWrapper';
import { calcNumericStats } from '../../utils/statistics';
import { useTheme } from '../../context/ThemeContext';
import { getChartThemeTokens } from '../../utils/chartTheme';
import { QQPlotView } from './QQPlotView';
import { Sliders, AlertCircle } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface NumericDistViewProps {
  columnName: string;
  values: any[];
}

export const NumericDistView: React.FC<NumericDistViewProps> = ({ columnName, values }) => {
  const [binCount, setBinCount] = useState<number>(25);
  const { isDark } = useTheme();
  const theme = getChartThemeTokens(isDark);

  const stats: NumericStats = React.useMemo(() => {
    return calcNumericStats(values, binCount);
  }, [values, binCount]);

  // Histogram + KDE Chart Option
  const histKdeOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12 },
    },
    legend: {
      data: ['直方圖頻率', '核密度估計 (KDE)'],
      textStyle: { color: theme.textColor, fontSize: 11 },
      right: '4%',
      top: '2%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: stats.histogram.map((b) => b.label),
      axisLabel: {
        rotate: stats.histogram.length > 15 ? 30 : 0,
        color: theme.textColor,
        fontSize: 10,
      },
      axisLine: { lineStyle: { color: theme.axisLine } },
    },
    yAxis: [
      {
        type: 'value',
        name: '頻率 (Count)',
        nameTextStyle: { color: theme.textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: theme.splitLine } },
        axisLabel: { color: theme.textColor },
      },
    ],
    series: [
      {
        name: '直方圖頻率',
        type: 'bar',
        data: stats.histogram.map((b) => b.count),
        itemStyle: {
          color: isDark ? '#3b82f6' : '#2563eb',
          borderRadius: [3, 3, 0, 0],
        },
      },
      {
        name: '核密度估計 (KDE)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: stats.histogram.map((_, idx) => {
          const ratio = idx / (stats.histogram.length - 1 || 1);
          const kdeIdx = Math.floor(ratio * (stats.kde.length - 1));
          return stats.kde[kdeIdx]?.y || 0;
        }),
        lineStyle: {
          color: '#f43f5e',
          width: 2.5,
        },
      },
    ],
  };

  // Boxplot Chart Option
  const boxplotOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12 },
      formatter: () => {
        return `
          <div style="font-size: 13px; font-weight:600; color:${theme.tooltipText};">${columnName} 箱線圖</div>
          <div style="font-size: 12px; color:${isDark ? '#cbd5e1' : '#475569'}; margin-top:4px;">最大值 (Max): <strong>${stats.max}</strong></div>
          <div style="font-size: 12px; color:${isDark ? '#cbd5e1' : '#475569'};">第三四分位 (Q3): <strong>${stats.q3}</strong></div>
          <div style="font-size: 12px; color:#0284c7;">中位數 (Median): <strong>${stats.median}</strong></div>
          <div style="font-size: 12px; color:${isDark ? '#cbd5e1' : '#475569'};">第一四分位 (Q1): <strong>${stats.q1}</strong></div>
          <div style="font-size: 12px; color:${isDark ? '#cbd5e1' : '#475569'};">最小值 (Min): <strong>${stats.min}</strong></div>
          <div style="font-size: 12px; color:#f59e0b; margin-top:2px;">四分位距 (IQR): <strong>${stats.iqr}</strong></div>
        `;
      },
    },
    grid: {
      left: '8%',
      right: '8%',
      top: '12%',
      bottom: '12%',
    },
    xAxis: {
      type: 'category',
      data: [columnName],
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisLabel: { color: theme.textColor },
    },
    yAxis: {
      type: 'value',
      name: '數值',
      nameTextStyle: { color: theme.textColor, fontSize: 11 },
      splitLine: { lineStyle: { color: theme.splitLine } },
      axisLabel: { color: theme.textColor },
    },
    series: [
      {
        name: '箱線圖',
        type: 'boxplot',
        data: [[stats.min, stats.q1, stats.median, stats.q3, stats.max]],
        itemStyle: {
          color: isDark ? '#1e293b' : '#f1f5f9',
          borderColor: isDark ? '#38bdf8' : '#0284c7',
          borderWidth: 1.5,
        },
      },
    ],
  };

  // CDF Chart Option
  const cdfOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12 },
      formatter: (p: any) => {
        const item = p[0];
        return `
          <div style="font-size:12px;">數值: <strong>${item.value[0]}</strong></div>
          <div style="font-size:12px; color:#10b981;">累積佔比: <strong>${item.value[1]}%</strong></div>
        `;
      },
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '12%',
      top: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: '數值',
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisLabel: { color: theme.textColor },
      splitLine: { lineStyle: { color: theme.splitLine } },
    },
    yAxis: {
      type: 'value',
      name: '累積比例 (%)',
      max: 100,
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisLabel: { color: theme.textColor, formatter: '{value}%' },
      splitLine: { lineStyle: { color: theme.splitLine } },
    },
    series: [
      {
        name: 'CDF',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: stats.cdf.map((c) => [c.x, c.y]),
        lineStyle: { color: '#10b981', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.0)' },
            ],
          },
        },
      },
    ],
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: '樣本總數', value: stats.count.toLocaleString() },
          { label: '平均值 (Mean)', value: stats.mean },
          { label: '標準差 (Std)', value: stats.std },
          { label: '中位數 (Median)', value: stats.median },
          { label: '四分位距 (IQR)', value: stats.iqr },
          { label: '偏態係數 (Skew)', value: stats.skewness },
          { label: '峰度係數 (Kurt)', value: stats.kurtosis },
          {
            label: '異常值 (Outliers)',
            value: `${stats.outliersCount} 筆`,
            danger: stats.outliersCount > 0,
          },
        ].map((m, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-sm"
          >
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
              {m.label}
            </div>
            <div
              className={`text-sm font-bold truncate mt-0.5 ${
                m.danger
                  ? 'text-amber-500 dark:text-amber-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Histogram + KDE with slider */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              直方圖 (Histogram) 與 核密度曲線 (KDE)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              展示資料集中程度與形狀（常態、左偏、右偏）
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <Sliders className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-slate-600 dark:text-slate-400">分箱數 (Bins):</span>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={binCount}
              onChange={(e) => setBinCount(Number(e.target.value))}
              className="w-24 accent-blue-500 cursor-pointer"
            />
            <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold w-5">
              {binCount}
            </span>
          </div>
        </div>

        <EChartWrapper option={histKdeOption} height={280} />
      </div>

      {/* 3 Secondary Plots: Boxplot, CDF, and Q-Q Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Boxplot */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">箱線圖 (Boxplot)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Min: {stats.min} | Median: {stats.median} | Max: {stats.max}
              </p>
            </div>
            {stats.outliersCount > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                <AlertCircle className="w-3 h-3" />
                <span>{stats.outliersCount} 筆離群</span>
              </div>
            )}
          </div>
          <EChartWrapper option={boxplotOption} height={240} />
        </div>

        {/* Cumulative Distribution CDF */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">累積分布 (CDF)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">展示門檻累積機率比例</p>
          </div>
          <EChartWrapper option={cdfOption} height={240} />
        </div>

        {/* Normal Q-Q Plot */}
        {stats.qqPlot && <QQPlotView columnName={columnName} qqData={stats.qqPlot} />}
      </div>
    </div>
  );
};
