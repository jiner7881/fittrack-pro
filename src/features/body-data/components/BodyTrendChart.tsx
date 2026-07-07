import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { BodyMeasurement } from '../../../core/types';

type MetricKey = 'bodyWeight' | 'bodyFatRate' | 'muscleMass' | 'bmi' | 'waistCircumference' | 'basalMetabolism';

interface BodyTrendChartProps {
  measurements: BodyMeasurement[];
  metric: MetricKey;
  days?: number;
}

const metricConfig: Record<MetricKey, { label: string; unit: string; color: string }> = {
  bodyWeight: { label: '体重', unit: 'kg', color: '#2E86C1' },
  bodyFatRate: { label: '体脂率', unit: '%', color: '#E67E22' },
  muscleMass: { label: '肌肉量', unit: 'kg', color: '#27AE60' },
  bmi: { label: 'BMI', unit: '', color: '#8E44AD' },
  waistCircumference: { label: '腰围', unit: 'cm', color: '#E74C3C' },
  basalMetabolism: { label: '基础代谢', unit: 'kcal', color: '#1ABC9C' },
};

export default function BodyTrendChart({ measurements, metric, days = 30 }: BodyTrendChartProps) {
  const config = metricConfig[metric];

  const chartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return measurements
      .filter((m) => m.date >= cutoffStr && m[metric] != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({
        date: m.date.slice(5), // MM-DD
        value: m[metric] as number,
      }));
  }, [measurements, metric, days]);

  const option = {
    grid: { top: 20, right: 15, bottom: 30, left: 45 },
    xAxis: {
      type: 'category' as const,
      data: chartData.map((d) => d.date),
      axisLabel: { fontSize: 10, color: '#999' },
      axisLine: { lineStyle: { color: '#eee' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { fontSize: 10, color: '#999' },
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'line' as const,
      data: chartData.map((d) => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color: config.color },
      itemStyle: { color: config.color },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: config.color + '40' },
            { offset: 1, color: config.color + '05' },
          ],
        } as any,
      },
    }],
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>${config.label}: ${p.value} ${config.unit}`;
      },
    },
  };

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray)', fontSize: 13 }}>
        暂无数据，开始记录吧
      </div>
    );
  }

  return <ReactECharts option={option} style={{ height: 200 }} />;
}
