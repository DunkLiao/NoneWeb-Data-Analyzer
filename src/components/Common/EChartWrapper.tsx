import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useTheme } from '../../context/ThemeContext';

interface EChartWrapperProps {
  option: echarts.EChartsOption;
  height?: string | number;
  width?: string | number;
  className?: string;
  onEvents?: Record<string, (params: any) => void>;
}

export const EChartWrapper: React.FC<EChartWrapperProps> = ({
  option,
  height = '350px',
  width = '100%',
  className = '',
  onEvents,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart with light or dark theme
    const chart = echarts.init(chartRef.current, theme === 'dark' ? 'dark' : undefined, {
      renderer: 'canvas',
    });
    chartInstance.current = chart;

    if (onEvents) {
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        chart.on(eventName, handler);
      });
    }

    const finalOption: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      ...option,
    };
    chart.setOption(finalOption, true);

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, [theme]); // Re-initialize when theme changes

  useEffect(() => {
    if (chartInstance.current) {
      const finalOption: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        ...option,
      };
      chartInstance.current.setOption(finalOption, true);
    }
  }, [option]);

  return (
    <div
      ref={chartRef}
      style={{ height, width }}
      className={`relative ${className}`}
    />
  );
};
