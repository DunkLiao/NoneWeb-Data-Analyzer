import React from 'react';
import type { CorrelationMatrix } from '../../types/data';
import { EChartWrapper } from '../Common/EChartWrapper';
import { useTheme } from '../../context/ThemeContext';
import { getChartThemeTokens } from '../../utils/chartTheme';
import { GitCompare, CheckCircle2 } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface MissingCorrelationProps {
  correlation: CorrelationMatrix;
}

export const MissingCorrelation: React.FC<MissingCorrelationProps> = ({ correlation }) => {
  const { columns, matrix } = correlation;
  const { isDark } = useTheme();
  const theme = getChartThemeTokens(isDark);

  if (columns.length < 2) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 text-emerald-500 mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">無須進行缺值共現分析</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
          當前資料集中具有缺失值的欄位少於 2 個（或皆無缺值），因此無需計算缺值相關性熱力圖。
        </p>
      </div>
    );
  }

  // Format data for ECharts Heatmap: [colIdx, rowIdx, value]
  const data: [number, number, number][] = [];
  for (let i = 0; i < columns.length; i++) {
    for (let j = 0; j < columns.length; j++) {
      data.push([j, i, matrix[i][j]]);
    }
  }

  const option: EChartsOption = {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [x, y, val] = params.value;
        const col1 = columns[x];
        const col2 = columns[y];
        return `
          <div style="font-size: 13px; font-weight:600; color:${theme.tooltipText};">${col1} ↔ ${col2}</div>
          <div style="font-size: 12px; color:${isDark ? '#cbd5e1' : '#475569'}; margin-top:3px;">缺值共現係數: <strong style="color: ${val > 0.3 ? '#ef4444' : val < -0.3 ? '#3b82f6' : '#64748b'}">${val}</strong></div>
          <div style="font-size: 11px; color:${theme.subText}; margin-top:2px;">(接近 +1 表示通常一起缺失，接近 -1 表示交替缺失)</div>
        `;
      },
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText },
    },
    grid: {
      left: '12%',
      right: '10%',
      bottom: '18%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: columns,
      axisLabel: {
        rotate: 35,
        color: theme.textColor,
        fontSize: 11,
      },
      axisLine: { lineStyle: { color: theme.axisLine } },
    },
    yAxis: {
      type: 'category',
      data: columns,
      axisLabel: { color: theme.textColor, fontSize: 11 },
      axisLine: { lineStyle: { color: theme.axisLine } },
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: isDark
          ? ['#3b82f6', '#1e293b', '#ef4444']
          : ['#3b82f6', '#f1f5f9', '#ef4444'],
      },
      textStyle: { color: theme.textColor, fontSize: 11 },
    },
    series: [
      {
        name: 'Nullity Correlation',
        type: 'heatmap',
        data: data,
        label: {
          show: columns.length <= 15,
          color: theme.tooltipText,
          fontSize: 10,
          formatter: (p: any) => p.value[2],
        },
        itemStyle: {
          borderColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 1,
        },
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-pink-500 dark:text-pink-400" />
            缺失值共現關聯熱力圖 (Nullity Correlation)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            衡量兩欄位是否「同時發生缺失」。係數接近 <strong className="text-red-500">+1</strong> 代表常常一同遺失；
            接近 <strong className="text-blue-500">-1</strong> 代表一欄缺值時另一欄通常完整。
          </p>
        </div>
      </div>

      <EChartWrapper option={option} height={360} />
    </div>
  );
};
