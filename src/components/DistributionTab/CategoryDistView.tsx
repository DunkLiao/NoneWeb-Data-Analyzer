import React, { useMemo, useState } from 'react';
import type { CategoricalStats } from '../../types/data';
import { calcCategoricalStats } from '../../utils/statistics';
import { EChartWrapper } from '../Common/EChartWrapper';
import type { EChartsOption } from 'echarts';

interface CategoryDistViewProps {
  columnName: string;
  values: any[];
}

export const CategoryDistView: React.FC<CategoryDistViewProps> = ({ columnName, values }) => {
  const [topN, setTopN] = useState<number>(10);

  const stats: CategoricalStats = useMemo(() => {
    return calcCategoricalStats(values);
  }, [values]);

  const topFrequencies = stats.frequencies.slice(0, topN);

  // Bar Chart Option
  const barOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      formatter: (p: any) => {
        const item = p[0];
        const freq = topFrequencies[item.dataIndex];
        return `
          <div style="font-weight:600;">${freq.value}</div>
          <div style="color:#cbd5e1; margin-top:2px;">出現次數: <strong>${freq.count.toLocaleString()}</strong></div>
          <div style="color:#38bdf8;">佔比: <strong>${freq.percentage}%</strong></div>
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
        color: '#94a3b8',
        fontSize: 11,
      },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      name: '次數',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        name: '頻率',
        type: 'bar',
        barMaxWidth: 40,
        data: topFrequencies.map((f) => f.count),
        itemStyle: {
          color: '#8b5cf6',
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          color: '#cbd5e1',
          fontSize: 10,
        },
      },
    ],
  };

  // Donut Pie Option
  const pieOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      formatter: '{b}: <strong>{c}</strong> ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '3%',
      top: 'center',
      textStyle: { color: '#94a3b8', fontSize: 11 },
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
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 'bold',
            color: '#f8fafc',
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-400 font-medium">有效類別樣本數</div>
          <div className="text-xl font-bold text-slate-100 mt-0.5">
            {stats.count.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-400 font-medium">唯一值種類 (Unique)</div>
          <div className="text-xl font-bold text-slate-100 mt-0.5">
            {stats.uniqueCount.toLocaleString()} 種
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-400 font-medium">最常見類別 (眾數 Mode)</div>
          <div className="text-lg font-bold text-purple-400 truncate mt-0.5">
            {stats.mode}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-400 font-medium">眾數佔比</div>
          <div className="text-xl font-bold text-slate-100 mt-0.5">
            {stats.count > 0 ? ((stats.modeCount / stats.count) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Top 頻率長條圖</h4>
              <p className="text-xs text-slate-400">各類別出現次數排名</p>
            </div>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
            </select>
          </div>
          <EChartWrapper option={barOption} height={260} />
        </div>

        {/* Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-slate-100">類別比例環形圖 (Donut)</h4>
            <p className="text-xs text-slate-400">主要類別分佈佔比</p>
          </div>
          <EChartWrapper option={pieOption} height={260} />
        </div>
      </div>

      {/* Frequency Detail Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-slate-100 mb-3">詳細類別頻率清單</h4>
        <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3 w-16">排名</th>
                <th className="py-2 px-3">類別名稱 (Value)</th>
                <th className="py-2 px-3 w-28">出現次數</th>
                <th className="py-2 px-3 w-24">佔比 (%)</th>
                <th className="py-2 px-3 w-40">比例示意</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats.frequencies.slice(0, 50).map((f, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-1.5 px-3 font-mono text-slate-500">#{idx + 1}</td>
                  <td className="py-1.5 px-3 font-medium text-slate-200 truncate max-w-xs">
                    {f.value || <span className="text-slate-500 italic">(空字串)</span>}
                  </td>
                  <td className="py-1.5 px-3">{f.count.toLocaleString()}</td>
                  <td className="py-1.5 px-3 font-mono text-purple-400">{f.percentage}%</td>
                  <td className="py-1.5 px-3">
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
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
