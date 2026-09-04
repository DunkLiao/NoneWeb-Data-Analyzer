export interface ChartThemeTokens {
  isDark: boolean;
  textColor: string;
  textMain: string;
  axisLine: string;
  splitLine: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  subText: string;
  borderColor: string;
}

export function getChartThemeTokens(isDark: boolean): ChartThemeTokens {
  return {
    isDark,
    textColor: isDark ? '#94a3b8' : '#64748b',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    axisLine: isDark ? '#334155' : '#e2e8f0',
    splitLine: isDark ? '#1e293b' : '#f1f5f9',
    tooltipBg: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
    tooltipBorder: isDark ? '#334155' : '#cbd5e1',
    tooltipText: isDark ? '#f8fafc' : '#0f172a',
    subText: isDark ? '#94a3b8' : '#64748b',
    borderColor: isDark ? '#1e293b' : '#e2e8f0',
  };
}
