'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_THEME } from './chartTheme';

interface RevenueByPlanDataPoint {
  month: string;
  pro: number;
  school: number;
}

interface RevenueByPlanChartProps {
  data: RevenueByPlanDataPoint[];
}

/**
 * Revenue by plan tier bar chart for the last 12 months.
 *
 * Requirements: 11.4, 2.9
 */
export function RevenueByPlanChart({ data }: RevenueByPlanChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
        <XAxis dataKey="month" tick={CHART_THEME.axis.tick} axisLine={CHART_THEME.axis.axisLine} tickLine={CHART_THEME.axis.tickLine} />
        <YAxis
          tick={CHART_THEME.axis.tick}
          axisLine={CHART_THEME.axis.axisLine}
          tickLine={CHART_THEME.axis.tickLine}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: CHART_THEME.tooltipBg, border: `1px solid ${CHART_THEME.tooltipBorder}`, borderRadius: 8, color: CHART_THEME.tooltipText, fontSize: 12 }}
          formatter={(value: number) => [`KES ${value.toLocaleString()}`, undefined]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_THEME.axis.tick.fill }} />
        <Bar dataKey="pro" name="Pro" fill={CHART_THEME.colors[0]} radius={[4, 4, 0, 0]} />
        <Bar dataKey="school" name="School" fill={CHART_THEME.colors[2]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
