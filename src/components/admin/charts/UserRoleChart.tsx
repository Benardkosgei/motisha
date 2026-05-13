'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  chartColors,
  tooltipContentStyle,
  tooltipLabelStyle,
  legendWrapperStyle,
  donutInnerRadius,
  donutOuterRadius,
  pieStroke,
  pieStrokeWidth,
} from './chartTheme';

interface UserRoleChartProps {
  data: Array<{ tier: string; count: number }>;
}

/**
 * UserRoleChart — distribution of subscription tiers (free / pro / school).
 * 
 * Requirements: 2.4, 2.9
 */
export function UserRoleChart({ data }: UserRoleChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="tier"
          innerRadius={donutInnerRadius}
          outerRadius={donutOuterRadius}
          stroke={pieStroke}
          strokeWidth={pieStrokeWidth}
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${entry.tier}`}
              fill={chartColors[index % chartColors.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value: number, name: string) => [value, name]}
        />
        <Legend
          wrapperStyle={legendWrapperStyle}
          formatter={(value) =>
            value.charAt(0).toUpperCase() + value.slice(1)
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
