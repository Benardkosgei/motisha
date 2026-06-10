/**
 * Shared chart theme configuration for Motisha admin dashboard.
 * All values are derived from the Motisha design tokens (C) in src/components/Logo.tsx.
 * Import this file in every chart component to ensure visual consistency.
 */

import { C } from '../../Logo';

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

/**
 * Ordered color palette for chart series.
 * Use chartColors[index % chartColors.length] to cycle through colors.
 */
export const chartColors: string[] = [
  C.teal,        // primary series  – sky blue
  C.mustard,     // secondary series – amber
  C.turquoise,   // tertiary series  – cyan
  C.tealGlow,    // quaternary       – light sky
  C.mustardLight,// quinary          – light amber
  C.mustardDark, // senary           – dark amber
  C.tealDark,    // septenary        – dark teal
  C.success,     // octonary         – green
  C.danger,      // nonary           – red
  C.gray,        // denary           – neutral
];

/** Convenience aliases for the most-used series colors */
export const CHART_COLOR_PRIMARY   = C.teal;
export const CHART_COLOR_SECONDARY = C.mustard;
export const CHART_COLOR_TERTIARY  = C.turquoise;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Default chart margins (pixels) passed to the Recharts `margin` prop */
export const defaultChartMargins = {
  top: 16,
  right: 24,
  bottom: 8,
  left: 8,
} as const;

/** Default chart dimensions – override per component as needed */
export const defaultChartDimensions = {
  height: 300,
  minWidth: 280,
} as const;

// ---------------------------------------------------------------------------
// Tooltip styles
// ---------------------------------------------------------------------------

/**
 * Inline styles for the Recharts `<Tooltip>` `contentStyle` prop.
 * Matches the dark navy admin shell background.
 */
export const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: C.navyMid,
  border: `1px solid ${C.navyLight}`,
  borderRadius: 8,
  color: C.white,
  fontSize: 13,
  padding: '8px 12px',
};

/** Label style for the tooltip header row */
export const tooltipLabelStyle: React.CSSProperties = {
  color: C.offWhite,
  fontWeight: 600,
  marginBottom: 4,
};

/** Item style for each tooltip data row */
export const tooltipItemStyle: React.CSSProperties = {
  color: C.gray,
};

// ---------------------------------------------------------------------------
// Axis styles
// ---------------------------------------------------------------------------

/** Props spread onto Recharts `<XAxis>` and `<YAxis>` components */
export const axisStyle = {
  tick: { fill: C.gray, fontSize: 12 },
  axisLine: { stroke: C.navyLight },
  tickLine: { stroke: C.navyLight },
} as const;

/** Stroke color for the Recharts `<CartesianGrid>` */
export const gridStroke = C.navyLight;

// ---------------------------------------------------------------------------
// Legend styles
// ---------------------------------------------------------------------------

/** Inline styles for the Recharts `<Legend>` `wrapperStyle` prop */
export const legendWrapperStyle: React.CSSProperties = {
  color: C.offWhite,
  fontSize: 12,
  paddingTop: 8,
};

// ---------------------------------------------------------------------------
// Dot / active dot styles (for LineChart)
// ---------------------------------------------------------------------------

export const lineDotStyle = {
  r: 3,
  strokeWidth: 2,
} as const;

export const lineActiveDotStyle = {
  r: 5,
  strokeWidth: 2,
  fill: C.navy,
} as const;

// ---------------------------------------------------------------------------
// Bar styles (for BarChart)
// ---------------------------------------------------------------------------

/** Default bar corner radius */
export const barRadius: [number, number, number, number] = [4, 4, 0, 0];

// ---------------------------------------------------------------------------
// Pie / Donut styles (for PieChart)
// ---------------------------------------------------------------------------

/** Inner radius ratio for donut charts (0 = full pie) */
export const donutInnerRadius = '55%';
export const donutOuterRadius = '80%';

/** Stroke between pie segments */
export const pieStroke = C.navyMid;
export const pieStrokeWidth = 2;

// ---------------------------------------------------------------------------
// Convenience bundle (used by chart components that import CHART_THEME)
// ---------------------------------------------------------------------------

export const CHART_THEME = {
  colors: chartColors,
  grid: gridStroke,
  axis: axisStyle,
  tooltipBg: C.navyMid,
  tooltipBorder: C.navyLight,
  tooltipText: C.white,
} as const;
