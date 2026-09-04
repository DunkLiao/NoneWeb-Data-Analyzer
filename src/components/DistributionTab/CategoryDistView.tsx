import React, { useMemo, useState } from 'react';
import type { CategoricalStats } from '../../types/data';
import { calcCategoricalStats } from '../../utils/statistics';
import { EChartWrapper } from '../Common/EChartWrapper';
import { useTheme } from '../../context/ThemeContext';
import { getChartThemeTokens } from '../../utils/chartTheme';
import { ParetoChartView } from './ParetoChartView';
import { CategoryTreemapView } from './CategoryTreemapView';
import { BarChart3, PieChart, LayoutGrid } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface CategoryDistViewProps {
  columnName: string;
  values: any[];
}

export const CategoryDistView: React.FC<CategoryDistViewProps> = ({ columnName, values }) => {
  const [topN, setTopN] = useState<number>(10);
  const [chartMode, setChartMode] = useState<'all' | 'basic' | 'pareto' | 'treemap'>('all');
  const { isDark } = useTheme();
  const theme = getChartThemeTokens(isDark);

  const stats: CategoricalStats = useMemo(() => {
    return calcCategoricalStats(values);
  }, [values]);

  const topFrequencies = stats.frequencies.slice(0, topN);

  // Bar Chart Option
  const barOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12 },
      formatter: (p: any) => {
        const item = p[0];
        const freq = topFrequencies[item.dataIndex];
        return `
          <div style="font-weight:600;">${freq.value}</div>
          <div style="color:${isDark ? '#cbd5e1' : '#475569'}; margin-top:2px;">出現次數: <strong>${freq.count.toLocaleString()}</strong></div>
          <div style="color:#0284c7;">佔比: <strong>${freq.percentage}%</strong></div>
        `;
      },
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
      data: topFrequencies.map((f) => f.value || '(空字串)'),
      axisLabel: {
        rotate: topFrequencies.length > 5 ? 30 : 0,
        color: theme.textColor,
        fontSize: 11,
      },
      axisLine: { lineStyle: { color: theme.axisLine } },
    },
    yAxis: {
      type: 'value',
      name: '次數',
      nameTextStyle: { color: theme.textColor, fontSize: 11 },
      splitLine: { lineStyle: { color: theme.splitLine } },
      axisLabel: { color: theme.textColor },
    },
    series: [
      {
        name: '頻率',
        type: 'bar',
        barMaxWidth: 40,
        data: topFrequencies.map((f) => f.count),
        itemStyle: {
          color: isDark ? '#8b5cf6' : '#7c3aed',
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          color: theme.textColor,
          fontSize: 10,
        },
      },
    ],
  };

  // Donut Pie Option
  const pieOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12 },
      formatter: '{b}: <strong>{c}</strong> ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '3%',
      top: 'center',
      textStyle: { color: theme.textColor, fontSize: 11 },
    },
    series: [
      {
        name: columnName,
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 'bold',
            color: theme.tooltipText,
          },
        },
        data: topFrequencies.map((f) => ({
          name: f.value || '(空字串)',
          value: f.count,
        })),
      },
    ],
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">有效類別樣本數</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {stats.count.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">唯一值種類 (Unique)</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {stats.uniqueCount.toLocaleString()} 種
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">最常見類別 (眾數 Mode)</div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400 truncate mt-0.5">
            {stats.mode}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">眾數佔比</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {stats.count > 0 ? ((stats.modeCount / stats.count) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* View Switcher Bar */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setChartMode('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              chartMode === 'all'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            四圖並列 (All)
          </button>
          <button
            onClick={() => setChartMode('basic')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              chartMode === 'basic'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            長條 & 環形圖
          </button>
          <button
            onClick={() => setChartMode('pareto')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              chartMode === 'pareto'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            柏拉圖 (Pareto 80/20)
          </button>
          <button
            onClick={() => setChartMode('treemap')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              chartMode === 'treemap'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            矩形樹狀圖 (Treemap)
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 pr-2">
          共 {stats.frequencies.length} 種唯一類別
        </div>
      </div>

      {/* Basic Charts: Bar + Donut */}
      {(chartMode === 'all' || chartMode === 'basic') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top 頻率長條圖</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">各類別出現次數排名</p>
              </div>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2 py-1"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </select>
            </div>
            <EChartWrapper option={barOption} height={260} />
          </div>

          {/* Donut Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="mb-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">類別比例環形圖 (Donut)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">主要類別分佈佔比</p>
            </div>
            <EChartWrapper option={pieOption} height={260} />
          </div>
        </div>
      )}

      {/* Advanced Charts: Pareto + Treemap */}
      {(chartMode === 'all' || chartMode === 'pareto' || chartMode === 'treemap') && (
        <div
          className={`grid grid-cols-1 ${
            chartMode === 'all' ? 'lg:grid-cols-2' : 'grid-cols-1'
          } gap-4`}
        >
          {(chartMode === 'all' || chartMode === 'pareto') && (
            <ParetoChartView columnName={columnName} paretoData={stats.pareto} />
          )}
          {(chartMode === 'all' || chartMode === 'treemap') && (
            <CategoryTreemapView columnName={columnName} frequencies={stats.frequencies} />
          )}
        </div>
      )}

      {/* Frequency Detail Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">詳細類別頻率清單</h4>
        <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 px-3 w-16">排名</th>
                <th className="py-2 px-3">類別名稱 (Value)</th>
                <th className="py-2 px-3 w-28">出現次數</th>
                <th className="py-2 px-3 w-24">佔比 (%)</th>
                <th className="py-2 px-3 w-40">比例示意</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {stats.frequencies.slice(0, 50).map((f, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-1.5 px-3 font-mono text-slate-400 dark:text-slate-500">#{idx + 1}</td>
                  <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-slate-200 truncate max-w-xs">
                    {f.value || <span className="text-slate-400 italic">(空字串)</span>}
                  </td>
                  <td className="py-1.5 px-3">{f.count.toLocaleString()}</td>
                  <td className="py-1.5 px-3 font-mono text-purple-600 dark:text-purple-400">{f.percentage}%</td>
                  <td className="py-1.5 px-3">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full"
                        style={{ width: `${f.percentage}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
