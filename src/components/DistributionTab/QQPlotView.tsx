import React from 'react';
import type { QQPlotData } from '../../types/data';
import { EChartWrapper } from '../Common/EChartWrapper';
import { useTheme } from '../../context/ThemeContext';
import { getChartThemeTokens } from '../../utils/chartTheme';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface QQPlotViewProps {
  columnName: string;
  qqData: QQPlotData;
}

export const QQPlotView: React.FC<QQPlotViewProps> = ({ columnName, qqData }) => {
  const { isDark } = useTheme();
  const theme = getChartThemeTokens(isDark);

  const statusConfig = {
    likely_normal: {
      label: '高度符合常態分佈',
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60',
    },
    moderate_deviation: {
      label: '輕度偏離常態分佈',
      icon: AlertTriangle,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60',
    },
    heavy_skewed: {
      label: '顯著偏離常態 (偏態/厚尾)',
      icon: AlertOctagon,
      color: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60',
    },
  }[qqData.normalityStatus];

  const StatusIcon = statusConfig.icon;

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12 },
      formatter: (p: any) => {
        if (p.seriesType === 'scatter') {
          return `
            <div style="font-weight:600; margin-bottom:2px;">${columnName} Q-Q 分位點</div>
            <div>理論常態分位 (Z): <strong>${p.value[0]}</strong></div>
            <div>樣本實體數值: <strong>${p.value[1]}</strong></div>
          `;
        }
        return `常態理論參考線 (Slope: ${qqData.slope})`;
      },
    },
    grid: {
      left: '6%',
      right: '6%',
      top: '12%',
      bottom: '14%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: '理論常態分位數 (Theoretical Z)',
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: theme.textColor, fontSize: 11 },
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisLabel: { color: theme.textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: theme.splitLine } },
    },
    yAxis: {
      type: 'value',
      name: '樣本實測分位數 (Sample)',
      nameTextStyle: { color: theme.textColor, fontSize: 11 },
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisLabel: { color: theme.textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: theme.splitLine } },
    },
    series: [
      {
        name: '理論參考線',
        type: 'line',
        showSymbol: false,
        data: qqData.line,
        lineStyle: {
          color: '#f43f5e',
          width: 2,
          type: 'dashed',
        },
      },
      {
        name: '樣本分位點',
        type: 'scatter',
        symbolSize: 6,
        data: qqData.points,
        itemStyle: {
          color: isDark ? '#38bdf8' : '#0284c7',
        },
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            常態機率 Q-Q 圖 (Quantile-Quantile Plot)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            若點群緊密貼合紅色虛線，代表該特徵符合高斯常態分佈
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
            判定係數 R²: <strong>{qqData.rSquared}</strong>
          </div>
          <div className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md border ${statusConfig.bg} ${statusConfig.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      <EChartWrapper option={option} height={240} />
    </div>
  );
};
