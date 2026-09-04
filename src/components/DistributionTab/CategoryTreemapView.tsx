import React from 'react';
import type { CategoryFrequency } from '../../types/data';
import { EChartWrapper } from '../Common/EChartWrapper';
import { useTheme } from '../../context/ThemeContext';
import { getChartThemeTokens } from '../../utils/chartTheme';
import type { EChartsOption } from 'echarts';

interface CategoryTreemapViewProps {
  columnName: string;
  frequencies: CategoryFrequency[];
}

export const CategoryTreemapView: React.FC<CategoryTreemapViewProps> = ({
  columnName,
  frequencies,
}) => {
  const { isDark } = useTheme();
  const theme = getChartThemeTokens(isDark);

  const treemapData = frequencies.map((f) => ({
    name: f.value || '(空值)',
    value: f.count,
    percentage: f.percentage,
  }));

  const option: EChartsOption = {
    tooltip: {
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12 },
      formatter: (params: any) => {
        const data = params.data;
        return `
          <div style="font-weight:600; margin-bottom:2px;">${data.name}</div>
          <div style="color:${isDark ? '#cbd5e1' : '#475569'};">出現次數: <strong>${data.value.toLocaleString()}</strong></div>
          <div style="color:#06b6d4; margin-top:2px;">佔比: <strong>${data.percentage}%</strong></div>
        `;
      },
    },
    series: [
      {
        name: columnName,
        type: 'treemap',
        visibleMin: 200,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: '{b}\n{c} ({d}%)',
          fontSize: 11,
          color: '#ffffff',
          fontWeight: 'bold',
        },
        itemStyle: {
          borderColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 2,
          gapWidth: 2,
        },
        color: [
          '#3b82f6',
          '#6366f1',
          '#8b5cf6',
          '#ec4899',
          '#14b8a6',
          '#f59e0b',
          '#10b981',
          '#06b6d4',
          '#f43f5e',
          '#84cc16',
        ],
        data: treemapData,
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          類別矩形樹狀圖 (Treemap 面積分布)
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          以面積比例呈現各類別權重，適合種類多、需要一覽全局分布的場景
        </p>
      </div>
      <EChartWrapper option={option} height={260} />
    </div>
  );
};
