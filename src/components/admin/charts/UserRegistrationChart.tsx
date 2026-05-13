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

interface UserRegistrationChartProps {
  data: Array<{ date: string; count: number }>;
}

/**
 * UserRegistrationChart — displays new user registrations over the last 30 days.
 * 
 * Requirements: 2.2, 2.9
 */
export function UserRegistrationChart({ data }: UserRegistrationChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={defaultChartMargins}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis
          dataKey="date"
          {...axisStyle}
          tickFormatter={(value) => {
            // Format as MM/DD
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis {...axisStyle} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          labelFormatter={(value) => {
            const date = new Date(value as string);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={chartColors[0]}
          strokeWidth={2.5}
          dot={lineDotStyle}
          activeDot={lineActiveDotStyle}
          name="New Users"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
