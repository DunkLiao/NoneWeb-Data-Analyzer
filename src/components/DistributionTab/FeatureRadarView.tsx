import React, { useState, useMemo } from 'react';
import { EChartWrapper } from '../Common/EChartWrapper';
import { useTheme } from '../../context/ThemeContext';
import { getChartThemeTokens } from '../../utils/chartTheme';
import { calcFeatureRadarData } from '../../utils/statistics';
import { Compass } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface FeatureRadarViewProps {
  rows: Record<string, any>[];
  numericColumns: string[];
}

export const FeatureRadarView: React.FC<FeatureRadarViewProps> = ({
  rows,
  numericColumns,
}) => {
  const { isDark } = useTheme();
  const theme = getChartThemeTokens(isDark);

  // By default, select first up to 4 numeric columns
  const [selectedCols, setSelectedCols] = useState<string[]>(() =>
    numericColumns.slice(0, 4)
  );

  const radarData = useMemo(() => {
    return calcFeatureRadarData(rows, selectedCols);
  }, [rows, selectedCols]);

  const toggleColumn = (col: string) => {
    if (selectedCols.includes(col)) {
      if (selectedCols.length > 1) {
        setSelectedCols(selectedCols.filter((c) => c !== col));
      }
    } else {
      if (selectedCols.length < 6) {
        setSelectedCols([...selectedCols, col]);
      }
    }
  };

  const option: EChartsOption = useMemo(() => {
    return {
      tooltip: {
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
      },
      legend: {
        data: radarData.series.map((s) => s.name),
        top: '2%',
        right: '4%',
        textStyle: { color: theme.textColor, fontSize: 11 },
      },
      radar: {
        indicator: radarData.indicators,
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: theme.textColor,
          fontSize: 11,
          fontWeight: 'bold',
        },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.8)',
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: isDark
              ? ['rgba(30, 41, 59, 0.3)', 'rgba(15, 23, 42, 0.5)']
              : ['rgba(248, 250, 252, 0.6)', 'rgba(241, 245, 249, 0.4)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(203, 213, 225, 0.9)',
          },
        },
      },
      series: [
        {
          name: '特徵輪廓',
          type: 'radar',
          data: radarData.series.map((s) => ({
            name: s.name,
            value: s.value,
            areaStyle: {
              opacity: 0.25,
            },
          })),
        },
      ],
    };
  }, [radarData, theme, isDark]);

  if (numericColumns.length < 2) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-teal-500" />
            特徵統計指紋雷達圖 (Feature Profile Radar)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            歸一化對比多個數值變量的均值、離散度 (CV)、中位數、IQR 展距與異常值率
          </p>
        </div>

        {/* Selected Columns Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400 mr-1">選擇特徵 (最多6項):</span>
          {numericColumns.map((col) => {
            const active = selectedCols.includes(col);
            return (
              <button
                key={col}
                type="button"
                onClick={() => toggleColumn(col)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {col}
              </button>
            );
          })}
        </div>
      </div>

      <EChartWrapper option={option} height={340} />
    </div>
  );
};
