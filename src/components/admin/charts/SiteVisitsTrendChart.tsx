'use client';

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_THEME, defaultChartMargins, lineDotStyle, lineActiveDotStyle, tooltipContentStyle } from '@/components/admin/charts/chartTheme';

interface SiteVisitsTrendChartProps {
  data: Array<{ day: string; visitors: number }>;
}

export function SiteVisitsTrendChart({ data }: SiteVisitsTrendChartProps) {
  return (
    <div style={{ width: '100%', minHeight: 280 }}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={defaultChartMargins}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
          <XAxis dataKey="day" tick={CHART_THEME.axis.tick} axisLine={CHART_THEME.axis.axisLine} tickLine={CHART_THEME.axis.tickLine} tickFormatter={(value) => value.slice(5)} />
          <YAxis tick={CHART_THEME.axis.tick} axisLine={CHART_THEME.axis.axisLine} tickLine={CHART_THEME.axis.tickLine} />
          <Tooltip contentStyle={tooltipContentStyle} />
          <Line
            type="monotone"
            dataKey="visitors"
            stroke={CHART_THEME.colors[0]}
            strokeWidth={3}
            dot={lineDotStyle}
            activeDot={lineActiveDotStyle}
            fillOpacity={0.2}
            fill={CHART_THEME.colors[0]}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
