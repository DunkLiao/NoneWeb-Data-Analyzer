import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

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

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    const chart = echarts.init(chartRef.current, 'dark', {
      renderer: 'canvas',
    });
    chartInstance.current = chart;

    if (onEvents) {
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        chart.on(eventName, handler);
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (chartInstance.current) {
      // Merge base dark background transparently
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
