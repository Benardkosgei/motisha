'use client';

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_THEME, defaultChartMargins, tooltipContentStyle } from '@/components/admin/charts/chartTheme';

interface TopPagesChartProps {
  data: Array<{ path: string; views: number }>;
}

export function TopPagesChart({ data }: TopPagesChartProps) {
  return (
    <div style={{ width: '100%', minHeight: 280 }}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={defaultChartMargins} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
          <XAxis type="number" tick={CHART_THEME.axis.tick} axisLine={CHART_THEME.axis.axisLine} tickLine={CHART_THEME.axis.tickLine} />
          <YAxis type="category" dataKey="path" tick={CHART_THEME.axis.tick} axisLine={CHART_THEME.axis.axisLine} tickLine={CHART_THEME.axis.tickLine} width={180} />
          <Tooltip contentStyle={tooltipContentStyle} />
          <Bar dataKey="views" fill={CHART_THEME.colors[1]} radius={[4, 0, 0, 4]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
