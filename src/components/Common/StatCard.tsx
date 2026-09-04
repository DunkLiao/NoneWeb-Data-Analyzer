import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeType?: 'default' | 'danger' | 'success' | 'warning';
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  badge,
  badgeType = 'default',
  icon,
}) => {
  const badgeStyles = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    danger: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60',
    success: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
    warning: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
  };

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-xl p-4 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {badge && (
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${badgeStyles[badgeType]}`}>
              {badge}
            </span>
          )}
          {subtext && <span className="text-xs text-slate-500 dark:text-slate-400">{subtext}</span>}
        </div>
      </div>
    </div>
  );
};
