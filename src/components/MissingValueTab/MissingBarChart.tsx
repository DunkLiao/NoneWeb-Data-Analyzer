import React, { useState } from 'react';
import type { ColumnMissingStat } from '../../types/data';
import { EChartWrapper } from '../Common/EChartWrapper';
import { BarChart3 } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface MissingBarChartProps {
  stats: ColumnMissingStat[];
}

export const MissingBarChart: React.FC<MissingBarChartProps> = ({ stats }) => {
  const [viewMode, setViewMode] = useState<'percent' | 'count'>('percent');

  // Filter columns or sort by missingRate
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
          <div style="font-size: 13px; font-weight: 600; color: #f8fafc; margin-bottom: 4px;">${stat.name}</div>
          <div style="font-size: 12px; color: #cbd5e1;">缺失比例: <strong style="color: #ef4444">${stat.missingRate}%</strong></div>
          <div style="font-size: 12px; color: #cbd5e1;">缺失筆數: <strong>${stat.missingCount.toLocaleString()}</strong> / ${stat.total.toLocaleString()}</div>
          <div style="font-size: 12px; color: #94a3b8;">有效筆數: ${stat.validCount.toLocaleString()}</div>
        `;
      },
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
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
        color: '#94a3b8',
        fontSize: 11,
      },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      name: viewMode === 'percent' ? '缺失率 (%)' : '缺失筆數',
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      max: viewMode === 'percent' ? 100 : undefined,
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: {
        color: '#94a3b8',
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
          let color = '#3b82f6'; // <5% Blue
          if (rate >= 25) {
            color = '#ef4444'; // >25% Red
          } else if (rate >= 5) {
            color = '#f59e0b'; // 5~25% Amber
          } else if (rate === 0) {
            color = '#10b981'; // 0% Green
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
          color: '#cbd5e1',
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            各欄位缺失值統計排行
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            按缺失率由高至低排列各欄位，色塊標示缺失嚴重程度（綠: 0% / 藍: &lt;5% / 黃: 5-25% / 紅: &gt;25%）。
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('percent')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              viewMode === 'percent'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            百分比 (%)
          </button>
          <button
            onClick={() => setViewMode('count')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              viewMode === 'count'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
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
