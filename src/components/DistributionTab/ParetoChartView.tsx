import React, { useState } from 'react';
import type { ParetoItem } from '../../types/data';
import { EChartWrapper } from '../Common/EChartWrapper';
import { useTheme } from '../../context/ThemeContext';
import { getChartThemeTokens } from '../../utils/chartTheme';
import type { EChartsOption } from 'echarts';

interface ParetoChartViewProps {
  columnName: string;
  paretoData: ParetoItem[];
}

export const ParetoChartView: React.FC<ParetoChartViewProps> = ({ columnName, paretoData }) => {
  const [topN, setTopN] = useState<number>(15);
  const { isDark } = useTheme();
  const theme = getChartThemeTokens(isDark);

  const displayData = paretoData.slice(0, topN);

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12 },
      formatter: (params: any) => {
        const barItem = params.find((p: any) => p.seriesType === 'bar');
        const lineItem = params.find((p: any) => p.seriesType === 'line');
        const cat = barItem?.name || '';
        const count = barItem?.value || 0;
        const cumPct = lineItem?.value || 0;

        return `
          <div style="font-weight:600; margin-bottom:4px;">${cat}</div>
          <div style="color:${isDark ? '#cbd5e1' : '#475569'};">頻率次數: <strong>${count.toLocaleString()}</strong></div>
          <div style="color:#f59e0b; margin-top:2px;">累計佔比: <strong>${cumPct}%</strong></div>
        `;
      },
    },
    grid: {
      left: '4%',
      right: '6%',
      top: '14%',
      bottom: '12%',
      containLabel: true,
    },
    legend: {
      data: ['類別頻率', '累計百分比 (Cumulative %)'],
      textStyle: { color: theme.textColor, fontSize: 11 },
      right: '4%',
      top: '2%',
    },
    xAxis: {
      type: 'category',
      data: displayData.map((d) => d.value || '(空字串)'),
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisLabel: {
        rotate: displayData.length > 6 ? 30 : 0,
        color: theme.textColor,
        fontSize: 10,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '出現次數',
        nameTextStyle: { color: theme.textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: theme.splitLine } },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisLabel: { color: theme.textColor },
      },
      {
        type: 'value',
        name: '累計百分比',
        nameTextStyle: { color: theme.textColor, fontSize: 11 },
        min: 0,
        max: 100,
        axisLabel: { color: theme.textColor, formatter: '{value}%' },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: theme.axisLine } },
      },
    ],
    series: [
      {
        name: '類別頻率',
        type: 'bar',
        barMaxWidth: 35,
        data: displayData.map((d) => d.count),
        itemStyle: {
          color: isDark ? '#6366f1' : '#4f46e5',
          borderRadius: [3, 3, 0, 0],
        },
      },
      {
        name: '累計百分比 (Cumulative %)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        data: displayData.map((d) => d.cumPercentage),
        lineStyle: {
          color: '#f59e0b',
          width: 2.5,
        },
        itemStyle: {
          color: '#f59e0b',
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: '#ef4444',
            type: 'dashed',
            width: 1.5,
          },
          data: [
            {
              yAxis: 80,
              label: {
                show: true,
                position: 'insideEndTop',
                formatter: '80% 核心界限',
                color: '#ef4444',
                fontSize: 10,
              },
            },
          ],
        },
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            柏拉圖分析 (Pareto Chart - 80/20 法則)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            迅速鎖定構成 80% 總量的前幾大關鍵類別
          </p>
        </div>

        <select
          value={topN}
          onChange={(e) => setTopN(Number(e.target.value))}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
        >
          <option value={10}>Top 10</option>
          <option value={15}>Top 15</option>
          <option value={25}>Top 25</option>
          <option value={50}>Top 50</option>
        </select>
      </div>

      <EChartWrapper option={option} height={260} />
    </div>
  );
};
