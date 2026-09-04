import React, { useState, useMemo } from 'react';
import { EChartWrapper } from '../Common/EChartWrapper';
import { useTheme } from '../../context/ThemeContext';
import { getChartThemeTokens } from '../../utils/chartTheme';
import { isValueMissing } from '../../utils/parser';
import { Layers } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface BubbleChart4DViewProps {
  rows: Record<string, any>[];
  numericColumns: string[];
  categoricalColumns: string[];
}

export const BubbleChart4DView: React.FC<BubbleChart4DViewProps> = ({
  rows,
  numericColumns,
  categoricalColumns,
}) => {
  const { isDark } = useTheme();
  const theme = getChartThemeTokens(isDark);

  const [colX, setColX] = useState<string>(numericColumns[0] || '');
  const [colY, setColY] = useState<string>(numericColumns[1] || numericColumns[0] || '');
  const [colSize, setColSize] = useState<string>(numericColumns[2] || numericColumns[0] || '');
  const [colColor, setColColor] = useState<string>(categoricalColumns[0] || 'none');

  const bubbleData = useMemo(() => {
    if (!colX || !colY || !colSize) {
      return { groups: {} as Record<string, [number, number, number, any][]>, minSize: 0, maxSize: 1 };
    }

    // Group rows by color column if selected
    const groups: Record<string, [number, number, number, any][]> = {};
    const sizeVals: number[] = [];

    rows.forEach((r) => {
      const vx = Number(r[colX]);
      const vy = Number(r[colY]);
      const vs = Number(r[colSize]);

      if (
        !isValueMissing(r[colX]) &&
        !isValueMissing(r[colY]) &&
        !isValueMissing(r[colSize]) &&
        !isNaN(vx) &&
        !isNaN(vy) &&
        !isNaN(vs)
      ) {
        const groupKey = colColor !== 'none' && !isValueMissing(r[colColor]) ? String(r[colColor]) : '全體樣本';
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push([vx, vy, vs, r[colColor]]);
        sizeVals.push(vs);
      }
    });

    const minSize = sizeVals.length > 0 ? Math.min(...sizeVals) : 0;
    const maxSize = sizeVals.length > 0 ? Math.max(...sizeVals) : 1;

    return { groups, minSize, maxSize };
  }, [rows, colX, colY, colSize, colColor]);

  const option: EChartsOption = useMemo(() => {
    const { groups, minSize, maxSize } = bubbleData;
    const range = maxSize - minSize || 1;

    const calcRadius = (val: number) => {
      const normalized = (val - minSize) / range;
      return Math.max(6, Math.min(36, Math.round(6 + normalized * 30)));
    };

    const groupKeys = Object.keys(groups || {});
    // Top 8 groups to avoid clutter
    const displayGroups = groupKeys.slice(0, 8);

    const series = displayGroups.map((gName) => ({
      name: gName,
      type: 'scatter' as const,
      data: (groups[gName] || []).map((pt) => [pt[0], pt[1], pt[2], pt[3]]),
      symbolSize: (data: any[]) => calcRadius(data[2]),
      itemStyle: {
        opacity: 0.75,
        shadowBlur: 6,
        shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.15)',
      },
    }));

    return {
      tooltip: {
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (p: any) => {
          const [x, y, s, grp] = p.value;
          return `
            <div style="font-weight:600; margin-bottom:4px;">${p.seriesName}</div>
            <div>${colX}: <strong>${x}</strong></div>
            <div>${colY}: <strong>${y}</strong></div>
            <div style="color:#06b6d4;">氣泡大小 (${colSize}): <strong>${s}</strong></div>
            ${colColor !== 'none' ? `<div style="color:#a855f7;">顏色分組 (${colColor}): <strong>${grp}</strong></div>` : ''}
          `;
        },
      },
      legend: {
        show: colColor !== 'none' && displayGroups.length > 1,
        top: '2%',
        right: '4%',
        textStyle: { color: theme.textColor, fontSize: 11 },
      },
      grid: {
        left: '5%',
        right: '5%',
        top: colColor !== 'none' && displayGroups.length > 1 ? '14%' : '8%',
        bottom: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: colX,
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: { color: theme.textColor, fontSize: 11 },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisLabel: { color: theme.textColor },
        splitLine: { lineStyle: { color: theme.splitLine } },
      },
      yAxis: {
        type: 'value',
        name: colY,
        nameTextStyle: { color: theme.textColor, fontSize: 11 },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisLabel: { color: theme.textColor },
        splitLine: { lineStyle: { color: theme.splitLine } },
      },
      series,
    };
  }, [bubbleData, colX, colY, colSize, colColor, theme, isDark]);

  if (numericColumns.length < 2) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            四維多變量氣泡圖 (Multivariate 4D Bubble Chart)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            融合 X軸、Y軸、氣泡大小與顏色分組，同步挖掘四項維度交織關聯
          </p>
        </div>

        {/* Dimension Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">X 軸:</span>
            <select
              value={colX}
              onChange={(e) => setColX(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1"
            >
              {numericColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Y 軸:</span>
            <select
              value={colY}
              onChange={(e) => setColY(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1"
            >
              {numericColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-cyan-600 dark:text-cyan-400 font-medium">大小:</span>
            <select
              value={colSize}
              onChange={(e) => setColSize(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1"
            >
              {numericColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-purple-600 dark:text-purple-400 font-medium">分組色彩:</span>
            <select
              value={colColor}
              onChange={(e) => setColColor(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1"
            >
              <option value="none">無色彩分組</option>
              {categoricalColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <EChartWrapper option={option} height={360} />
    </div>
  );
};
