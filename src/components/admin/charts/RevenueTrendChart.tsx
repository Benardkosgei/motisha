'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  chartColors,
  defaultChartMargins,
  tooltipContentStyle,
  tooltipLabelStyle,
  axisStyle,
  gridStroke,
  lineDotStyle,
  lineActiveDotStyle,
} from './chartTheme';

interface RevenueTrendChartProps {
  data: Array<{ month: string; revenue: number }>;
}

/**
 * RevenueTrendChart — displays monthly revenue for the last 12 months.
 * 
 * Requirements: 2.5, 2.9
 */
export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={defaultChartMargins}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis
          dataKey="month"
          {...axisStyle}
          tickFormatter={(value) => {
            // Format YYYY-MM as Mon 'YY
            const [year, month] = (value as string).split('-');
            const date = new Date(Number(year), Number(month) - 1);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit',
            });
          }}
        />
        <YAxis
          {...axisStyle}
          tickFormatter={(value) =>
            value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
          }
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          labelFormatter={(value) => {
            const [year, month] = (value as string).split('-');
            const date = new Date(Number(year), Number(month) - 1);
            return date.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            });
          }}
          formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Revenue']}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={chartColors[1]}
          strokeWidth={2.5}
          dot={lineDotStyle}
          activeDot={lineActiveDotStyle}
          name="Revenue (KES)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
