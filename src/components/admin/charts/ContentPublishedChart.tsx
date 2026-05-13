'use client';

import React from 'react';
import {
  BarChart,
  Bar,
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
  barRadius,
} from './chartTheme';

interface ContentPublishedChartProps {
  data: Array<{ type: string; count: number }>;
}

/**
 * ContentPublishedChart — displays content published per type for the current month.
 * 
 * Requirements: 2.3, 2.9
 */
export function ContentPublishedChart({ data }: ContentPublishedChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={defaultChartMargins}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="type" {...axisStyle} />
        <YAxis {...axisStyle} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
        />
        <Bar
          dataKey="count"
          fill={chartColors[1]}
          radius={barRadius}
          name="Published"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
