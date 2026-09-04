import React, { useState } from 'react';
import type { ColumnMissingStat } from '../../types/data';
import { EChartWrapper } from '../Common/EChartWrapper';
import { useTheme } from '../../context/ThemeContext';
import { getChartThemeTokens } from '../../utils/chartTheme';
import { BarChart3 } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface MissingBarChartProps {
  stats: ColumnMissingStat[];
}

export const MissingBarChart: React.FC<MissingBarChartProps> = ({ stats }) => {
  const [viewMode, setViewMode] = useState<'percent' | 'count'>('percent');
  const { isDark } = useTheme();
  const theme = getChartThemeTokens(isDark);

  const displayStats = [...stats].sort((a, b) => b.missingRate - a.missingRate);

  const columnNames = displayStats.map((s) => s.name);
  const values = displayStats.map((s) => (viewMode === 'percent' ? s.missingRate : s.missingCount));

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0];
        const stat = displayStats[item.dataIndex];
        return `
          <div style="font-size: 13px; font-weight: 600; color: ${theme.tooltipText}; margin-bottom: 4px;">${stat.name}</div>
          <div style="font-size: 12px; color: ${isDark ? '#cbd5e1' : '#475569'};">缺失比例: <strong style="color: #ef4444">${stat.missingRate}%</strong></div>
          <div style="font-size: 12px; color: ${isDark ? '#cbd5e1' : '#475569'};">缺失筆數: <strong>${stat.missingCount.toLocaleString()}</strong> / ${stat.total.toLocaleString()}</div>
          <div style="font-size: 12px; color: ${theme.subText};">有效筆數: ${stat.validCount.toLocaleString()}</div>
        `;
      },
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: columnNames,
      axisLabel: {
        rotate: columnNames.length > 8 ? 35 : 0,
        interval: 0,
        color: theme.textColor,
        fontSize: 11,
      },
      axisLine: { lineStyle: { color: theme.axisLine } },
    },
    yAxis: {
      type: 'value',
      name: viewMode === 'percent' ? '缺失率 (%)' : '缺失筆數',
      nameTextStyle: { color: theme.textColor, fontSize: 11 },
      max: viewMode === 'percent' ? 100 : undefined,
      splitLine: { lineStyle: { color: theme.splitLine } },
      axisLabel: {
        color: theme.textColor,
        formatter: viewMode === 'percent' ? '{value}%' : '{value}',
      },
    },
    series: [
      {
        name: '缺失值',
        type: 'bar',
        barMaxWidth: 45,
        data: values.map((val, idx) => {
          const rate = displayStats[idx].missingRate;
          let color = isDark ? '#3b82f6' : '#2563eb';
          if (rate >= 25) {
            color = '#ef4444';
          } else if (rate >= 5) {
            color = '#f59e0b';
          } else if (rate === 0) {
            color = '#10b981';
          }
          return {
            value: val,
            itemStyle: {
              color,
              borderRadius: [4, 4, 0, 0],
            },
          };
        }),
        label: {
          show: true,
          position: 'top',
          color: theme.textColor,
          fontSize: 11,
          formatter: (params: any) => {
            const val = params.value;
            return viewMode === 'percent' ? (val > 0 ? `${val}%` : '0%') : val > 0 ? val : '';
          },
        },
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            各欄位缺失值統計排行
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            按缺失率由高至低排列各欄位，色塊標示缺失嚴重程度（綠: 0% / 藍: &lt;5% / 黃: 5-25% / 紅: &gt;25%）。
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('percent')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              viewMode === 'percent'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            百分比 (%)
          </button>
          <button
            onClick={() => setViewMode('count')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              viewMode === 'count'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            筆數 (Count)
          </button>
        </div>
      </div>

      <EChartWrapper option={option} height={320} />
    </div>
  );
};
