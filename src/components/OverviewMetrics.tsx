import React from 'react';
import type { OverallMissingStat, ParsedDataset } from '../types/data';
import { StatCard } from './Common/StatCard';
import { Database, FileSpreadsheet, AlertTriangle, CheckCircle2, Columns } from 'lucide-react';

interface OverviewMetricsProps {
  dataset: ParsedDataset;
  overall: OverallMissingStat;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({ dataset, overall }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const missingSeverity =
    overall.overallMissingRate > 20
      ? 'danger'
      : overall.overallMissingRate > 5
      ? 'warning'
      : 'success';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <StatCard
        title="資料維度"
        value={`${overall.totalRows.toLocaleString()} 列`}
        subtext={`${overall.totalCols} 欄位`}
        icon={<Database className="w-4 h-4 text-blue-400" />}
      />
      <StatCard
        title="儲存格總數"
        value={overall.totalCells.toLocaleString()}
        subtext={`大小: ${formatBytes(dataset.fileSize)}`}
        icon={<FileSpreadsheet className="w-4 h-4 text-indigo-400" />}
      />
      <StatCard
        title="缺失值總數"
        value={overall.totalMissingCells.toLocaleString()}
        badge={`${overall.overallMissingRate}% 缺失`}
        badgeType={missingSeverity}
        icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
      />
      <StatCard
        title="完整列數 (無缺失)"
        value={overall.completeRowsCount.toLocaleString()}
        badge={`${overall.completeRowsRate}% 完整`}
        badgeType="success"
        icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
      />
      <StatCard
        title="含缺值欄位"
        value={`${overall.colsWithMissingCount} / ${overall.totalCols}`}
        subtext={overall.colsWithMissingCount === 0 ? '所有欄位均完整' : '需特別注意'}
        icon={<Columns className="w-4 h-4 text-purple-400" />}
      />
    </div>
  );
};
